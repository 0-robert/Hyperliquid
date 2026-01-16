import { useEffect } from 'react';
import { LiFiWidget, useWidgetEvents, WidgetEvent } from '@lifi/widget';
import { useBridgeState } from './stores/useBridgeState';
import { CHAINS, CONTRACTS } from './config/constants';
import './index.css';

interface HyperGateProps {
    userAddress: string;
}

import { useL1Deposit } from './hooks/useL1Deposit';

export function HyperGate({ userAddress }: HyperGateProps) {
    const { state, setState, setError } = useBridgeState();
    const widgetEvents = useWidgetEvents();
    const { depositToL1, isLoading: isDepositingL1 } = useL1Deposit();

    // Configuration for the widget
    const widgetConfig: any = {
        integrator: 'HyperGate',
        toChain: CHAINS.HYPEREVM.id,
        toToken: CONTRACTS.USDC_HYPEREVM,
        toAddress: userAddress as any, // Cast to avoid complex type mismatch for now
        hiddenUI: ['toAddress', 'toToken', 'appearance'] as any,
        appearance: 'light',
        enableGas: true, // Gas Refuel
        theme: {
            container: {
                borderRadius: '16px',
                maxWidth: '100%',
                boxShadow: 'none', // We use our own shadow in container
            },
            palette: {
                primary: { main: '#A855F7' },
            },
        },
    };

    useEffect(() => {
        const onRouteExecuted = async (route: any) => {
            console.log('✅ Step 1 Complete: Funds on HyperEVM', route);
            setState('DEPOSITING');

            try {
                // Auto-trigger deposit (User needs to sign)
                // route.toAmount is usually string. Check LiFi docs. Assuming string.
                const amount = BigInt(route.toAmount);
                await depositToL1(amount);
                setState('SUCCESS');
            } catch (err) {
                console.error('❌ L1 Deposit Failed:', err);
                setError('DEPOSIT_FAILED');
            }
        };

        const onRouteFailed = (error: any) => {
            console.error('❌ Bridge failed:', error);
            setState('IDLE');
            setError('BRIDGE_FAILED');
        };

        // Safety Guard (Interception attempt)
        const onRouteExecutionStarted = (route: any) => {
            const amountUSD = parseFloat(route.toAmountUSD || '0');
            if (amountUSD < 5.1) {
                alert('⚠️ SAFETY GUARD ACTIVE: Deposit < $5 will be burned by Hyperliquid. Transaction Aborted (if possible) or Warned.');
                // Ideally we throw here if we could.
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
    }, [widgetEvents, setState, setError, depositToL1]);

    return (
        <div className="hypergate-widget-container flex flex-col items-center justify-center min-h-[500px] w-full max-w-[400px] mx-auto bg-neutral-900/90 backdrop-blur-xl border border-white/10 ring-1 ring-inset ring-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-[24px] p-4 font-sans">
            <div className="w-full h-full text-white relative">
                {state === 'IDLE' || state === 'QUOTING' || state === 'BRIDGING' ? (
                    <div className="relative z-10">
                        <LiFiWidget config={widgetConfig} integrator="HyperGate" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 py-20 text-center animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-hyper-primary/20 blur-xl rounded-full"></div>
                            <div className="text-4xl relative z-10">{state === 'SUCCESS' ? '🎉' : '🔄'}</div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                {state === 'SUCCESS' ? 'Funds Arrived!' : 'Depositing to L1...'}
                            </div>
                            <div className="text-sm text-gray-400 max-w-[200px] mx-auto">
                                {state === 'SUCCESS'
                                    ? 'Your USDC is now in your Hyperliquid Trading Account. Ready to trade.'
                                    : 'Bridging complete. Now forwarding to your trading account. Please sign the transaction.'}
                            </div>
                        </div>

                        {state === 'DEPOSITING' && isDepositingL1 && (
                            <div className="text-xs text-hyper-primary animate-pulse">
                                Waiting for signature...
                            </div>
                        )}

                        {state === 'SUCCESS' && (
                            <button
                                onClick={() => window.open('https://app.hyperliquid.xyz/trade', '_blank')}
                                className="px-6 py-3 bg-hyper-primary hover:bg-purple-600 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-purple-900/20"
                            >
                                Open Terminal
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

