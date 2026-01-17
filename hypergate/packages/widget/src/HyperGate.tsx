import { useEffect, useState, useRef, useCallback } from 'react';
import { LiFiWidget, useWidgetEvents, WidgetEvent } from '@lifi/widget';
import { useBridgeState, type BridgeState } from './stores/useBridgeState';
import { CHAINS, CONTRACTS, LIMITS } from './config/constants';
import { usePublicClient } from 'wagmi';
import { parseAbi } from 'viem';
import { useL1Deposit } from './hooks/useL1Deposit';
import { apiClient } from './services/api';
import { ErrorRecovery } from './components/ErrorRecovery';
import { ProgressSteps } from './components/ProgressSteps';
import { DemoModal } from './components/DemoModal';
import './index.css';

// =============================================================================
// Types & Interfaces (Exported for consumers)
// =============================================================================

export interface HyperGateTheme {
    /** Primary accent color (default: #A855F7) */
    primaryColor?: string;
    /** Container border radius (default: 24px) */
    borderRadius?: string;
    /** Container max width (default: 400px) */
    containerMaxWidth?: string;
}

export interface HyperGateCallbacks {
    /** Called when bridge+deposit completes successfully */
    onSuccess?: (data: { txHash: string; amount: string }) => void;
    /** Called when an error occurs */
    onError?: (error: { type: string; message: string }) => void;
    /** Called on every state change */
    onStatusChange?: (status: BridgeState) => void;
}

export interface HyperGateProps {
    /** User's connected wallet address (required) */
    userAddress: string;
    /** Optional theme customization */
    theme?: HyperGateTheme;
    /** Optional callback handlers */
    callbacks?: HyperGateCallbacks;
    /** Show progress indicator (default: true) */
    showProgress?: boolean;
    /** Custom class name for container */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function HyperGate({
    userAddress,
    theme,
    callbacks,
    showProgress = true,
    className = '',
}: HyperGateProps) {
    const { state, setState, setError, setSafetyPayload, safetyPayload, error, reset } = useBridgeState();
    const widgetEvents = useWidgetEvents();
    const { depositToL1, isLoading: isDepositingL1 } = useL1Deposit();
    const publicClient = usePublicClient();

    // Local state
    const [isConfirmingRisk, setIsConfirmingRisk] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const depositIdRef = useRef<string | null>(null);
    const lastAmountRef = useRef<bigint | null>(null);
    const lastTxHashRef = useRef<string | null>(null);

    // Theme defaults
    const primaryColor = theme?.primaryColor || '#A855F7';
    const borderRadius = theme?.borderRadius || '24px';
    const containerMaxWidth = theme?.containerMaxWidth || '400px';

    // Notify parent of state changes
    const notifyStatusChange = useCallback((newState: BridgeState) => {
        callbacks?.onStatusChange?.(newState);
    }, [callbacks]);

    // Wrap setState to also notify callbacks
    const setStateWithCallback = useCallback((newState: BridgeState) => {
        setState(newState);
        notifyStatusChange(newState);
    }, [setState, notifyStatusChange]);

    // Configuration for the LI.FI widget
    const widgetConfig: any = {
        integrator: 'HyperGate',
        toChain: CHAINS.HYPEREVM.id,
        toToken: CONTRACTS.USDC_HYPEREVM,
        toAddress: userAddress as any,
        hiddenUI: ['toAddress', 'toToken', 'appearance'] as any,
        appearance: 'light',
        enableGas: true,
        theme: {
            container: {
                borderRadius: '16px',
                maxWidth: '100%',
                boxShadow: 'none',
            },
            palette: {
                primary: { main: primaryColor },
            },
        },
    };

    // Stored route to resume after safety check
    const [_pendingRoute, setPendingRoute] = useState<any>(null);

    const handleSafetyCheck = (route: any) => {
        // Parse fee data
        const fromAmountUSD = parseFloat(route.fromAmountUSD || '0');
        const toAmountUSD = parseFloat(route.toAmountUSD || '0');
        const gasCostUSD = parseFloat(route.gasCostUSD || '0');

        // If gasCostUSD is missing, sum up steps
        const totalGasUSD = gasCostUSD > 0 ? gasCostUSD : route.steps.reduce((acc: number, step: any) => {
            return acc + (step.estimate.gasCosts?.reduce((gAcc: number, g: any) => gAcc + parseFloat(g.amountUSD), 0) || 0);
        }, 0);

        const bridgeFeeUSD = fromAmountUSD - toAmountUSD - totalGasUSD; // Rough estimate of spread + fees
        const netAmount = toAmountUSD;

        const isSafe = netAmount >= LIMITS.MINIMUM_DEPOSIT;

        setSafetyPayload({
            inputAmount: fromAmountUSD,
            bridgeFee: Math.max(0, bridgeFeeUSD),
            gasCost: totalGasUSD,
            netAmount: netAmount,
            isSafe: isSafe
        });

        setPendingRoute(route);
        setStateWithCallback('SAFETY_GUARD');
    };

    useEffect(() => {
        const onRouteExecuted = async (route: any) => {
            console.log('✅ Step 1 Complete: Funds on HyperEVM', route);

            // SECURITY: Input Validation
            if (!route || typeof route.toAmount !== 'string') {
                console.error('❌ Security: Invalid route data from LI.FI');
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Invalid route data received' });
                return;
            }

            // SECURITY: Decimal Handling & Overflow Protection
            let amount: bigint;
            try {
                if (!/^\d+$/.test(route.toAmount)) throw new Error('Invalid amount format');
                amount = BigInt(route.toAmount);

                if (parseFloat(route.toAmountUSD) > LIMITS.MAXIMUM_DEPOSIT) {
                    throw new Error('Amount exceeds maximum deposit limit');
                }
            } catch (e) {
                console.error('❌ Security: Amount validation failed', e);
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Amount validation failed' });
                return;
            }

            // SECURITY: Balance Verification
            try {
                if (!publicClient) throw new Error('No public client available');

                await new Promise(r => setTimeout(r, 2000));

                const balance = await publicClient.readContract({
                    address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                    functionName: 'balanceOf',
                    args: [userAddress as `0x${string}`]
                });

                if (balance < amount) {
                    console.error(`❌ Security: Asset Mismatch. Route says ${amount}, Balance is ${balance}`);
                    if (balance === 0n) {
                        throw new Error('Zero balance detected after bridge.');
                    }
                    console.warn('⚠️ Depositing actual balance instead of route amount');
                    amount = balance;
                }
            } catch (err) {
                console.error('❌ Security: Balance verification failed:', err);
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Balance verification failed' });
                return;
            }

            setStateWithCallback('DEPOSITING');
            lastAmountRef.current = amount;

            // Notify backend that bridge completed
            if (depositIdRef.current && route.transactionHash) {
                try {
                    await apiClient.notifyBridgeSuccess(
                        depositIdRef.current,
                        route.transactionHash,
                        amount.toString()
                    );
                    console.log('📝 Backend notified of bridge success');
                } catch (err) {
                    console.warn('Failed to notify backend of bridge success:', err);
                }
            }

            try {
                const txHash = await depositToL1(amount);
                lastTxHashRef.current = txHash || null;

                if (depositIdRef.current && txHash) {
                    try {
                        await apiClient.notifyL1Success(
                            depositIdRef.current,
                            txHash,
                            amount.toString()
                        );
                        console.log('📝 Backend notified of L1 deposit success');
                    } catch (err) {
                        console.warn('Failed to notify backend of L1 success:', err);
                    }
                }

                setStateWithCallback('SUCCESS');
                callbacks?.onSuccess?.({ txHash: txHash || '', amount: amount.toString() });
            } catch (err) {
                console.error('❌ L1 Deposit Failed:', err);
                setError('DEPOSIT_FAILED');
                callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'L1 deposit transaction failed' });
            }
        };

        const onRouteFailed = (err: any) => {
            console.error('❌ Bridge failed:', err);
            setStateWithCallback('IDLE');
            setError('BRIDGE_FAILED');
            callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: err?.message || 'Bridge transaction failed' });
        };

        const onRouteExecutionStarted = async (route: any) => {
            handleSafetyCheck(route);

            try {
                const response = await apiClient.createDeposit({
                    userAddress,
                    sourceChain: route.fromChainId?.toString() || 'unknown',
                    sourceToken: route.fromToken?.symbol || 'USDC',
                    sourceAmount: route.fromAmount || '0',
                    expectedDestinationAmount: route.toAmount || '0',
                });

                if (response.success && response.data) {
                    depositIdRef.current = response.data.id;
                    console.log('📝 Deposit record created:', response.data.id);
                }
            } catch (err) {
                console.warn('Failed to create deposit record:', err);
            }
        };

        widgetEvents.on(WidgetEvent.RouteExecutionCompleted, onRouteExecuted);
        widgetEvents.on(WidgetEvent.RouteExecutionFailed, onRouteFailed);
        widgetEvents.on(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);

        return () => {
            widgetEvents.off(WidgetEvent.RouteExecutionCompleted, onRouteExecuted);
            widgetEvents.off(WidgetEvent.RouteExecutionFailed, onRouteFailed);
            widgetEvents.off(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);
        };
    }, [widgetEvents, setStateWithCallback, setError, depositToL1, setSafetyPayload, publicClient, userAddress, callbacks]);

    // Demo Mode Logic
    const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const isDemoMode = userAddress === TEST_ADDRESS;

    const handleDemoSubmit = (inputAmount: number) => {
        setShowDemoModal(false);
        const mockFees = 2.20;
        const mockDestAmount = Math.max(0, inputAmount - mockFees);

        const mockCalculatedRoute = {
            fromAmountUSD: inputAmount.toFixed(2),
            toAmountUSD: mockDestAmount.toFixed(2),
            gasCostUSD: '1.20',
            steps: []
        };
        handleSafetyCheck(mockCalculatedRoute);
    };

    // Error recovery handlers
    const handleRetryBridge = () => {
        reset();
        notifyStatusChange('IDLE');
    };

    const handleRetryDeposit = async () => {
        if (!lastAmountRef.current) {
            if (publicClient) {
                try {
                    const balance = await publicClient.readContract({
                        address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                        functionName: 'balanceOf',
                        args: [userAddress as `0x${string}`]
                    });
                    if (balance > 0n) {
                        lastAmountRef.current = balance;
                    }
                } catch (err) {
                    console.error('Failed to fetch balance for retry:', err);
                }
            }
        }

        if (!lastAmountRef.current || lastAmountRef.current === 0n) {
            alert('Unable to determine deposit amount. Please start a new bridge.');
            reset();
            return;
        }

        setError(null);
        setStateWithCallback('DEPOSITING');

        try {
            const txHash = await depositToL1(lastAmountRef.current);
            lastTxHashRef.current = txHash || null;

            if (depositIdRef.current && txHash) {
                try {
                    await apiClient.notifyL1Success(
                        depositIdRef.current,
                        txHash,
                        lastAmountRef.current.toString()
                    );
                } catch (err) {
                    console.warn('Failed to notify backend of L1 success:', err);
                }
            }

            setStateWithCallback('SUCCESS');
            callbacks?.onSuccess?.({ txHash: txHash || '', amount: lastAmountRef.current.toString() });
        } catch (err) {
            console.error('❌ L1 Deposit Retry Failed:', err);
            setError('DEPOSIT_FAILED');
            callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'L1 deposit retry failed' });
        }
    };

    const handleCancelError = () => {
        reset();
        notifyStatusChange('IDLE');
    };

    // Resume function called by Safety Guard Modal
    const proceedWithBridge = async () => {
        if (state === 'SAFETY_GUARD' && safetyPayload && !safetyPayload.isSafe) {
            alert("Cannot proceed: Deposit amount is below the minimum safe limit. Funds would be lost.");
            return;
        }

        if (isDemoMode) {
            setStateWithCallback('BRIDGING');
            await new Promise(r => setTimeout(r, 2000));

            const mockRoute = { toAmount: '5000000', toToken: { address: CONTRACTS.USDC_HYPEREVM }, toAmountUSD: '5.00' };
            console.log('✅ Demo Step 1 Complete');
            setStateWithCallback('DEPOSITING');
            try {
                await depositToL1(BigInt(mockRoute.toAmount));
                setStateWithCallback('SUCCESS');
                callbacks?.onSuccess?.({ txHash: 'demo-tx-hash', amount: mockRoute.toAmount });
            } catch (err) {
                setError('DEPOSIT_FAILED');
                callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'Demo deposit failed' });
            }
        } else {
            setStateWithCallback('BRIDGING');
        }
    };

    // Container styles with theme
    const containerStyle = {
        borderRadius,
        maxWidth: containerMaxWidth,
    } as React.CSSProperties;

    return (
        <div
            className={`hypergate-widget-container flex flex-col items-center justify-center min-h-[500px] w-full mx-auto bg-neutral-900/90 backdrop-blur-xl border border-white/10 ring-1 ring-inset ring-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 font-sans ${className}`}
            style={containerStyle}
        >
            {/* Progress Steps */}
            {showProgress && <ProgressSteps />}

            <div className="w-full h-full text-white relative flex-1">
                {/* Demo Modal */}
                <DemoModal
                    isOpen={showDemoModal}
                    onClose={() => setShowDemoModal(false)}
                    onSubmit={handleDemoSubmit}
                />

                {/* Error Recovery Overlay */}
                {error && (
                    <ErrorRecovery
                        onRetryBridge={handleRetryBridge}
                        onRetryDeposit={handleRetryDeposit}
                        onCancel={handleCancelError}
                    />
                )}

                {state === 'SAFETY_GUARD' && safetyPayload && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className={`text-4xl mb-4 ${safetyPayload.isSafe ? 'text-green-500' : 'text-red-500'}`}>
                            {safetyPayload.isSafe ? '🛡️' : '⚠️'}
                        </div>
                        <h3 className="text-xl font-bold mb-6">Safety Guard Check</h3>

                        <div className="w-full space-y-3 mb-8">
                            <div className="flex justify-between text-gray-400">
                                <span>Input</span>
                                <span>${safetyPayload.inputAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-400">
                                <span>Bridge Fee (Est.)</span>
                                <span>-${safetyPayload.bridgeFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-red-400">
                                <span>Gas Cost</span>
                                <span>-${safetyPayload.gasCost.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-white/10 my-2"></div>
                            <div className={`flex justify-between font-bold text-lg ${safetyPayload.isSafe ? 'text-green-400' : 'text-red-500'}`}>
                                <span>Est. Received</span>
                                <span>${safetyPayload.netAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Minimum Required</span>
                                <span>$5.10</span>
                            </div>
                        </div>

                        {!safetyPayload.isSafe && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs text-center mb-6">
                                <b>CRITICAL WARNING:</b> You will receive less than $5. Hyperliquid will <b>BURN</b> this deposit.
                            </div>
                        )}

                        <div className="flex flex-col gap-3 w-full">
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => { setStateWithCallback('IDLE'); setIsConfirmingRisk(false); }}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (safetyPayload.isSafe) {
                                            proceedWithBridge();
                                        } else {
                                            if (!isConfirmingRisk) {
                                                setIsConfirmingRisk(true);
                                            } else {
                                                setIsConfirmingRisk(false); // Toggle off if clicked again? Or keep it? Let's just keep it simple.
                                            }
                                        }
                                    }}
                                    disabled={!safetyPayload.isSafe && isConfirmingRisk}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all shadow-lg 
                                        ${safetyPayload.isSafe
                                            ? 'bg-green-600 hover:bg-green-500'
                                            : isConfirmingRisk
                                                ? 'bg-red-600/50 grayscale cursor-not-allowed'
                                                : 'bg-red-600 hover:bg-red-500'
                                        }`}
                                >
                                    {safetyPayload.isSafe ? 'Proceed' : 'Risk It'}
                                </button>
                            </div>

                            {isConfirmingRisk && !safetyPayload.isSafe && (
                                <div className="w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="relative">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[6px] w-3 h-3 bg-red-900 rotate-45 border-l border-t border-red-800"></div>
                                        <button
                                            onClick={() => proceedWithBridge()}
                                            className="w-full py-4 bg-red-900 hover:bg-red-800 border border-red-800 rounded-xl font-bold text-red-100 transition-colors shadow-xl flex flex-col items-center gap-1"
                                        >
                                            <span className="text-lg">ARE YOU SURE?</span>
                                            <span className="text-[10px] font-normal opacity-80">Funds will likely be lost permanently.</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {state === 'IDLE' || state === 'QUOTING' || state === 'BRIDGING' ? (
                    <div className="relative z-10 flex flex-col gap-4">
                        <LiFiWidget config={widgetConfig} integrator="HyperGate" />

                        {isDemoMode && state === 'IDLE' && (
                            <button
                                onClick={() => setShowDemoModal(true)}
                                className="w-full py-3 bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 rounded-xl text-sm font-semibold hover:bg-yellow-500/30 transition-colors active:scale-[0.98]"
                            >
                                ⚡ Simulate Bridge (Demo)
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 py-16 text-center animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 blur-xl rounded-full" style={{ backgroundColor: `${primaryColor}33` }}></div>
                            <div className="text-5xl relative z-10">{state === 'SUCCESS' ? '🎉' : '🔄'}</div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                {state === 'SUCCESS' ? 'Funds Arrived!' : 'Depositing to L1...'}
                            </div>
                            <div className="text-sm text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                                {state === 'SUCCESS'
                                    ? 'Your USDC is now in your Hyperliquid Trading Account. Ready to trade.'
                                    : 'Bridging complete. Now forwarding to your trading account. Please sign the transaction.'}
                            </div>
                        </div>

                        {state === 'DEPOSITING' && isDepositingL1 && (
                            <div className="flex items-center gap-2 text-sm animate-pulse" style={{ color: primaryColor }}>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Waiting for signature...
                            </div>
                        )}

                        {state === 'SUCCESS' && (
                            <div className="flex flex-col gap-3 w-full max-w-[200px]">
                                <button
                                    onClick={() => window.open('https://app.hyperliquid.xyz/trade', '_blank')}
                                    className="w-full px-6 py-3 rounded-xl font-medium transition-all active:scale-[0.98] shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Open Terminal
                                </button>
                                <button
                                    onClick={() => { reset(); notifyStatusChange('IDLE'); }}
                                    className="w-full px-6 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    Bridge More
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

