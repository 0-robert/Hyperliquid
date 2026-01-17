import { useBridgeState, ErrorState } from '../stores/useBridgeState';

interface ErrorRecoveryProps {
    onRetryBridge: () => void;
    onRetryDeposit: () => void;
    onCancel: () => void;
}

interface ErrorConfig {
    icon: string;
    title: string;
    description: string;
    primaryAction: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    helpText?: string;
}

export function ErrorRecovery({ onRetryBridge, onRetryDeposit, onCancel }: ErrorRecoveryProps) {
    const { error, reset } = useBridgeState();

    if (!error) return null;

    const getErrorConfig = (errorType: ErrorState): ErrorConfig | null => {
        switch (errorType) {
            case 'BRIDGE_FAILED':
                return {
                    icon: '❌',
                    title: 'Bridge Failed',
                    description: 'The cross-chain transfer could not be completed. Your funds are safe on the source chain.',
                    primaryAction: {
                        label: 'Try Again',
                        onClick: () => {
                            reset();
                            onRetryBridge();
                        },
                    },
                    secondaryAction: {
                        label: 'Cancel',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                    },
                    helpText: 'This can happen due to network congestion or slippage. Try again with a higher gas limit.',
                };

            case 'DEPOSIT_FAILED':
                return {
                    icon: '⚠️',
                    title: 'L1 Deposit Failed',
                    description: 'Your funds are on HyperEVM but the deposit to your trading account failed.',
                    primaryAction: {
                        label: 'Retry Deposit',
                        onClick: onRetryDeposit,
                    },
                    secondaryAction: {
                        label: 'Start Over',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                    },
                    helpText: 'Your USDC is safe on HyperEVM. Click "Retry Deposit" to try again.',
                };

            case 'NO_GAS':
                return {
                    icon: '⛽',
                    title: 'Insufficient Gas',
                    description: 'You need HYPE tokens to pay for the L1 deposit transaction.',
                    primaryAction: {
                        label: 'Get Gas',
                        onClick: () => {
                            window.open('https://app.hyperliquid.xyz/drip', '_blank');
                        },
                    },
                    secondaryAction: {
                        label: 'Retry',
                        onClick: onRetryDeposit,
                    },
                    helpText: 'Enable "Gas Refuel" option when bridging to automatically receive HYPE for gas.',
                };

            case 'BELOW_MINIMUM':
                return {
                    icon: '🚫',
                    title: 'Amount Too Low',
                    description: 'Deposits below $5.10 will be burned by Hyperliquid. Please increase your amount.',
                    primaryAction: {
                        label: 'Start Over',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                    },
                    helpText: 'The minimum deposit amount is $5.10 to ensure your funds are not lost.',
                };

            default:
                return null;
        }
    };

    const config = getErrorConfig(error);
    if (!config) return null;

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-5xl mb-4">{config.icon}</div>

            <h3 className="text-xl font-bold mb-2 text-white">{config.title}</h3>

            <p className="text-gray-400 text-sm text-center mb-6 max-w-[280px]">
                {config.description}
            </p>

            {config.helpText && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-xs text-center mb-6 max-w-[280px]">
                    💡 {config.helpText}
                </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <button
                    onClick={config.primaryAction.onClick}
                    className="w-full py-3 bg-hyper-primary hover:bg-purple-600 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-purple-900/20"
                >
                    {config.primaryAction.label}
                </button>

                {config.secondaryAction && (
                    <button
                        onClick={config.secondaryAction.onClick}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors text-gray-300"
                    >
                        {config.secondaryAction.label}
                    </button>
                )}
            </div>
        </div>
    );
}
