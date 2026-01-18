import { useEffect, useState, useRef, useCallback } from 'react';
import { LiFiWidget, useWidgetEvents, WidgetEvent } from '@lifi/widget';
import type { Route } from '@lifi/sdk';
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
// Helpers
// =============================================================================

/** Format duration in seconds to human-readable string (e.g., "~3 min" or "~45 sec") */
function formatDuration(seconds: number): string {
    if (seconds <= 0) return 'Unknown';
    if (seconds < 60) return `~${Math.round(seconds)} sec`;
    const minutes = Math.round(seconds / 60);
    return `~${minutes} min`;
}

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
    const { state, setState, setError, setSafetyPayload, safetyPayload, error, reset, amountMismatchPayload, setAmountMismatchPayload } = useBridgeState();
    const widgetEvents = useWidgetEvents();
    const { depositToL1, isLoading: isDepositingL1 } = useL1Deposit();
    const publicClient = usePublicClient();

    // Local state
    const [isConfirmingRisk, setIsConfirmingRisk] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [isVerifyingBalance, setIsVerifyingBalance] = useState(false);
    const [showRetryError, setShowRetryError] = useState(false);
    const depositIdRef = useRef<string | null>(null);
    const lastAmountRef = useRef<bigint | null>(null);
    const lastTxHashRef = useRef<string | null>(null);

    // Theme defaults
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

    // Detect mobile viewport for responsive widget configuration
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Configuration for the LI.FI widget - optimized for mobile
     
    const widgetConfig: Record<string, unknown> = {
        integrator: 'HyperGate',
        variant: isMobile ? 'compact' : 'default',
        toChain: CHAINS.HYPEREVM.id,
        toToken: CONTRACTS.USDC_HYPEREVM,
        toAddress: userAddress,
        hiddenUI: ['toAddress', 'toToken', 'appearance'],
        appearance: 'light',
        enableGas: true,
        theme: {
            container: {
                display: isMobile ? 'flex' : 'block',
                height: isMobile ? '100%' : 'auto',
                borderRadius: isMobile ? '16px' : '16px',
                maxWidth: '100%',
                boxShadow: 'none',
                border: 'none',
            },
            palette: {
                primary: { main: '#000000' },
                secondary: { main: '#F4F4F5' },
            },
            shape: {
                borderRadius: isMobile ? 10 : 12,
                borderRadiusSecondary: isMobile ? 10 : 12,
            },
            typography: {
                fontFamily: 'Inter, sans-serif',
            }
        },
    };

    // Stored route to resume after safety check
    const [, setPendingRoute] = useState<Route | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSafetyCheck = (route: Route | any) => {
        // Parse fee data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routeAny = route as any;
        const fromAmountUSD = parseFloat(routeAny.fromAmountUSD || '0');
        const toAmountUSD = parseFloat(routeAny.toAmountUSD || '0');
        const gasCostUSD = parseFloat(routeAny.gasCostUSD || '0');

        // If gasCostUSD is missing, sum up steps
        const steps = (route.steps as unknown as Array<Record<string, unknown>>) || [];
        const totalGasUSD = gasCostUSD > 0 ? gasCostUSD : steps.reduce((acc: number, step) => {
             
            const estimate = step.estimate as Record<string, unknown> | undefined;
            const gasCosts = (estimate?.gasCosts as Array<Record<string, unknown>>) || [];
            return acc + gasCosts.reduce((gAcc: number, g) => gAcc + parseFloat((g.amountUSD as string) || '0'), 0);
        }, 0);

        // Extract estimated execution duration from route steps (in seconds)
        const estimatedDuration = steps.reduce((acc: number, step) => {
             
            const estimate = step.estimate as Record<string, unknown> | undefined;
            return acc + ((estimate?.executionDuration as number) || 0);
        }, 0);

        const bridgeFeeUSD = fromAmountUSD - toAmountUSD - totalGasUSD; // Rough estimate of spread + fees
        const netAmount = toAmountUSD;

        const isSafe = netAmount >= LIMITS.MINIMUM_DEPOSIT;

        setSafetyPayload({
            inputAmount: fromAmountUSD,
            bridgeFee: Math.max(0, bridgeFeeUSD),
            gasCost: totalGasUSD,
            netAmount: netAmount,
            isSafe: isSafe,
            estimatedDuration: estimatedDuration
        });

        setPendingRoute(route);
        setStateWithCallback('SAFETY_GUARD');
    };

    useEffect(() => {
        const onRouteExecuted = async (route: Route) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const routeData = route as any;

            // SECURITY: Input Validation
            if (!routeData || typeof routeData.toAmount !== 'string') {
                console.error('❌ Security: Invalid route data from LI.FI');
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Invalid route data received' });
                return;
            }

            // SECURITY: Decimal Handling & Overflow Protection
            let amount: bigint;
            try {
                if (!/^\d+$/.test(routeData.toAmount)) throw new Error('Invalid amount format');
                amount = BigInt(routeData.toAmount);

                if (parseFloat(routeData.toAmountUSD) > LIMITS.MAXIMUM_DEPOSIT) {
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

                setIsVerifyingBalance(true);
                await new Promise(r => setTimeout(r, 2000));

                const balance = await publicClient.readContract({
                    address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                    functionName: 'balanceOf',
                    args: [userAddress as `0x${string}`]
                });
                setIsVerifyingBalance(false);

                if (balance < amount) {
                    console.error(`❌ Security: Asset Mismatch. Route says ${amount}, Balance is ${balance}`);
                    if (balance === 0n) {
                        throw new Error('Zero balance detected after bridge.');
                    }

                    // Calculate mismatch details for user confirmation
                    const expectedUSD = parseFloat(route.toAmountUSD || '0');
                    // Estimate actual USD based on ratio (USDC has 6 decimals)
                    const ratio = Number(balance) / Number(amount);
                    const actualUSD = expectedUSD * ratio;
                    const differencePercent = ((expectedUSD - actualUSD) / expectedUSD) * 100;

                    // Store mismatch info and require user confirmation
                    setAmountMismatchPayload({
                        expectedAmount: amount,
                        actualAmount: balance,
                        expectedUSD,
                        actualUSD,
                        differencePercent,
                    });
                    lastAmountRef.current = balance; // Store actual amount for when user confirms
                    setStateWithCallback('AMOUNT_MISMATCH');
                    return; // Wait for user confirmation
                }
            } catch (err) {
                setIsVerifyingBalance(false);
                console.error('❌ Security: Balance verification failed:', err);
                setError('BRIDGE_FAILED');
                callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Balance verification failed' });
                return;
            }

            setStateWithCallback('DEPOSITING');
            lastAmountRef.current = amount;

            // Notify backend that bridge completed
            if (depositIdRef.current && routeData.transactionHash) {
                try {
                    await apiClient.notifyBridgeSuccess(
                        depositIdRef.current,
                        routeData.transactionHash,
                        amount.toString()
                    );
                } catch (_err) {
                    // Non-critical: backend notification failed but bridge succeeded
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
                    } catch (_err) {
                        // Non-critical: backend notification failed but deposit succeeded
                    }
                }

                setStateWithCallback('SUCCESS');
                callbacks?.onSuccess?.({ txHash: txHash || '', amount: amount.toString() });
            } catch (_err) {
                console.error('❌ L1 Deposit Failed:', _err);
                setError('DEPOSIT_FAILED');
                callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'L1 deposit transaction failed' });
            }
        };

        const onRouteFailed = () => {
            console.error('❌ Bridge failed');
            setStateWithCallback('IDLE');
            setError('BRIDGE_FAILED');
            callbacks?.onError?.({ type: 'BRIDGE_FAILED', message: 'Bridge transaction failed' });
        };

        const onRouteExecutionStarted = async (route: Route) => {
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
                }
            } catch (_err) {
                // Non-critical: deposit record creation failed
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            steps: [{ estimate: { executionDuration: 180 } }] // Mock 3 minute ETA
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
                } catch (_err) {
                    // Could not fetch balance for retry
                }
            }
        }

        if (!lastAmountRef.current || lastAmountRef.current === 0n) {
            setShowRetryError(true);
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
                } catch (_err) {
                    // Non-critical: backend notification failed
                }
            }

            setStateWithCallback('SUCCESS');
            callbacks?.onSuccess?.({ txHash: txHash || '', amount: lastAmountRef.current.toString() });
        } catch (_err) {
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
        // User has already confirmed via the "Risk It" → "ARE YOU SURE?" flow if amount is unsafe
        if (isDemoMode) {
            setStateWithCallback('BRIDGING');
            await new Promise(r => setTimeout(r, 2000));

            const mockRoute = { toAmount: '5000000', toToken: { address: CONTRACTS.USDC_HYPEREVM }, toAmountUSD: '5.00' };
            setStateWithCallback('DEPOSITING');
            try {
                await depositToL1(BigInt(mockRoute.toAmount));
                setStateWithCallback('SUCCESS');
                callbacks?.onSuccess?.({ txHash: 'demo-tx-hash', amount: mockRoute.toAmount });
            } catch (_err) {
                setError('DEPOSIT_FAILED');
                callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'Demo deposit failed' });
            }
        } else {
            setStateWithCallback('BRIDGING');
        }
    };

    // Handler for when user confirms they want to proceed despite amount mismatch
    const proceedWithMismatchedAmount = async () => {
        if (!lastAmountRef.current || lastAmountRef.current === 0n) {
            setError('DEPOSIT_FAILED');
            callbacks?.onError?.({ type: 'DEPOSIT_FAILED', message: 'No amount available for deposit' });
            return;
        }

        const amount = lastAmountRef.current;
        setAmountMismatchPayload(null);
        setStateWithCallback('DEPOSITING');

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
                } catch (err) {
                    // Non-critical: backend notification failed but deposit succeeded
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

    // Handler for when user cancels after seeing amount mismatch
    const cancelMismatch = () => {
        setAmountMismatchPayload(null);
        reset();
        notifyStatusChange('IDLE');
    };

    // Container styles with theme
    const containerStyle = {
        borderRadius,
        maxWidth: containerMaxWidth,
    } as React.CSSProperties;

    return (
        <div
            className={`hypergate-widget-container flex flex-col items-center justify-center min-h-[500px] w-full mx-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-float)] p-6 font-sans relative overflow-hidden ${className}`}
            style={containerStyle}
        >
            {/* Progress Steps */}
            {showProgress && <ProgressSteps />}

            <div className="w-full h-full text-[var(--text-primary)] relative flex-1">
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

                {/* Balance Verification Loading Overlay */}
                {isVerifyingBalance && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm p-6 fade-in">
                        <svg className="w-12 h-12 animate-spin mb-4 text-black" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div className="text-lg font-bold mb-1">Verifying Balance</div>
                        <div className="text-sm text-[var(--text-secondary)]">Confirming funds arrived on HyperEVM...</div>
                    </div>
                )}

                {/* Retry Error Modal */}
                {showRetryError && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-2xl text-red-500">
                            ✕
                        </div>
                        <div className="text-lg font-bold mb-2">Unable to Retry</div>
                        <div className="text-sm text-[var(--text-secondary)] mb-6 max-w-[280px]">
                            Could not determine deposit amount. Please start a new bridge transaction.
                        </div>
                        <button
                            onClick={() => { setShowRetryError(false); reset(); }}
                            className="px-6 py-2.5 bg-black text-white rounded-[10px] font-medium hover:bg-zinc-800 transition-all active:scale-[0.98]"
                        >
                            Start Over
                        </button>
                    </div>
                )}

                {/* Amount Mismatch Confirmation Modal */}
                {state === 'AMOUNT_MISMATCH' && amountMismatchPayload && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 animate-in fade-in duration-200">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-amber-50 text-amber-600">
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2 font-display text-[var(--text-primary)]">Amount Mismatch</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6 text-center max-w-[280px]">
                            The bridge delivered less than expected. Do you want to proceed?
                        </p>

                        <div className="w-full space-y-4 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--text-secondary)]">Expected Amount</span>
                                <span className="font-medium font-mono text-[var(--text-primary)]">${amountMismatchPayload.expectedUSD.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--text-secondary)]">Actual Received</span>
                                <span className="font-medium font-mono text-amber-600">${amountMismatchPayload.actualUSD.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-[var(--border-subtle)] my-2"></div>
                            <div className="flex justify-between items-center text-base font-bold">
                                <span className="text-[var(--text-primary)]">Difference</span>
                                <span className="font-mono text-red-500">-{amountMismatchPayload.differencePercent.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-[10px] text-amber-700 text-xs text-center mb-6 font-medium">
                            This may be due to slippage or bridge fees. Your funds are safe on HyperEVM.
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={cancelMismatch}
                                className="flex-1 py-3 bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-zinc-200 rounded-[10px] font-semibold transition-colors active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={proceedWithMismatchedAmount}
                                className="flex-1 py-3 bg-black text-white hover:bg-zinc-800 rounded-[10px] font-semibold transition-all shadow-sm active:scale-[0.98]"
                            >
                                Deposit ${amountMismatchPayload.actualUSD.toFixed(2)}
                            </button>
                        </div>
                    </div>
                )}

                {state === 'SAFETY_GUARD' && safetyPayload && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 animate-in fade-in duration-200">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${safetyPayload.isSafe ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {safetyPayload.isSafe ? (
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>
                            ) : (
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            )}
                        </div>
                        <h3 className="text-xl font-bold mb-6 font-display text-[var(--text-primary)]">Safety Check</h3>

                        <div className="w-full space-y-4 mb-8">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--text-secondary)]">Initial Input</span>
                                <span className="font-medium font-mono text-[var(--text-primary)]">${safetyPayload.inputAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--text-secondary)]">Bridge Fee</span>
                                <span className="font-medium font-mono text-amber-600">-${safetyPayload.bridgeFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--text-secondary)]">Gas Costs</span>
                                <span className="font-medium font-mono text-amber-600">-${safetyPayload.gasCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--text-secondary)]">Estimated Time</span>
                                <span className="font-medium font-mono text-[var(--text-primary)]">{formatDuration(safetyPayload.estimatedDuration)}</span>
                            </div>
                            <div className="h-px bg-[var(--border-subtle)] my-2"></div>
                            <div className="flex justify-between items-center text-base font-bold">
                                <span className="text-[var(--text-primary)]">Net Received</span>
                                <span className={`font-mono ${safetyPayload.isSafe ? 'text-green-600' : 'text-red-500'}`}>${safetyPayload.netAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                                <span>Minimum Required</span>
                                <span className="font-mono">$5.10</span>
                            </div>
                        </div>

                        {!safetyPayload.isSafe && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-[10px] text-red-600 text-xs text-center mb-6 font-medium">
                                Funds will be burned by Hyperliquid protocol if deposited (&lt; $5.10).
                            </div>
                        )}

                        <div className="flex flex-col gap-3 w-full">
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => { setStateWithCallback('IDLE'); setIsConfirmingRisk(false); }}
                                    className="flex-1 py-3 bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-zinc-200 rounded-[10px] font-semibold transition-colors active:scale-[0.98]"
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
                                                setIsConfirmingRisk(false);
                                            }
                                        }
                                    }}
                                    disabled={!safetyPayload.isSafe && isConfirmingRisk}
                                    className={`flex-1 py-3 rounded-[10px] font-semibold transition-all shadow-sm
                                        ${safetyPayload.isSafe
                                            ? 'bg-black text-white hover:bg-zinc-800'
                                            : isConfirmingRisk
                                                ? 'bg-red-100 text-red-300 cursor-not-allowed'
                                                : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                >
                                    {safetyPayload.isSafe ? 'Proceed' : 'Risk It'}
                                </button>
                            </div>

                            {isConfirmingRisk && !safetyPayload.isSafe && (
                                <div className="w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={() => proceedWithBridge()}
                                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 rounded-[10px] font-bold text-white transition-colors shadow-lg flex flex-col items-center gap-0.5"
                                    >
                                        <span className="text-sm">I UNDERSTAND THE RISK</span>
                                        <span className="text-[10px] opacity-90 uppercase tracking-wider">Depositing anyway</span>
                                    </button>
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
                                className="w-full py-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-[12px] text-sm font-semibold hover:bg-amber-100 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                Simulate Bridge (Demo)
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-black/5 rounded-full blur-xl scale-150"></div>
                            <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-xl relative z-10">
                                {state === 'SUCCESS' ?
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    :
                                    <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                }
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-2xl font-bold font-display text-[var(--text-primary)]">
                                {state === 'SUCCESS' ? 'Funds Arrived' : 'Depositing...'}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] max-w-[280px] mx-auto leading-relaxed">
                                {state === 'SUCCESS'
                                    ? 'Your USDC is now in your Hyperliquid Trading Account. Ready to trade.'
                                    : 'Bridging complete. Now forwarding to your trading account. Please sign the transaction.'}
                            </div>
                        </div>

                        {state === 'DEPOSITING' && isDepositingL1 && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-subtle)] rounded-full text-xs font-medium text-[var(--text-primary)]">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Waiting for signature...
                            </div>
                        )}

                        {state === 'SUCCESS' && (
                            <div className="flex flex-col gap-3 w-full max-w-[240px]">
                                <button
                                    onClick={() => window.open('https://app.hyperliquid.xyz/trade', '_blank')}
                                    className="w-full px-6 py-3.5 bg-black text-white rounded-[12px] font-bold transition-all hover:bg-zinc-800 shadow-lg active:scale-[0.98]"
                                >
                                    Open Terminal
                                </button>
                                <button
                                    onClick={() => { reset(); notifyStatusChange('IDLE'); }}
                                    className="w-full px-6 py-2 text-[var(--text-tertiary)] hover:text-black text-sm transition-colors font-medium"
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
