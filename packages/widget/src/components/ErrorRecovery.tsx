import { useBridgeState } from '../stores/useBridgeState';
import type { ErrorState } from '../stores/useBridgeState';

interface ErrorRecoveryProps {
    onRetryBridge: () => void;
    onRetryDeposit: () => void;
    onCancel: () => void;
}

interface ErrorConfig {
    icon: React.ReactNode;
    title: string;
    description: string;
    primaryAction: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'danger';
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    helpText?: string;
}

// Icons
const WarningIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 mb-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const GasIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-900 mb-2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const StopIcon = () => (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mb-2">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
    </svg>
);


import brokenBridgeImg from '../assets/broken_bridge.png';

export function ErrorRecovery({ onRetryBridge, onRetryDeposit, onCancel }: ErrorRecoveryProps) {
    const { error, reset } = useBridgeState();

    if (!error) return null;

    const getErrorConfig = (errorType: ErrorState): ErrorConfig | null => {
        switch (errorType) {
            case 'BRIDGE_FAILED':
                return {
                    icon: <img src={brokenBridgeImg} alt="Bridge Failed" className="w-[80px] h-auto mb-2 opacity-90" />,
                    title: 'Bridge Failed',
                    description: "The transfer couldn't complete. Don't worry, your funds are still safe in your wallet.",
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
                    helpText: 'Common causes: network congestion, price moved too much during transfer, or temporary RPC issues. Usually works on retry.',
                };

            case 'DEPOSIT_FAILED':
                return {
                    icon: <WarningIcon />,
                    title: 'Deposit Failed',
                    description: "Your USDC arrived on HyperEVM, but we couldn't forward it to your trading account.",
                    primaryAction: {
                        label: 'Retry Deposit',
                        onClick: onRetryDeposit,
                    },
                    secondaryAction: {
                        label: 'Close',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                    },
                    helpText: 'Your funds are safe on HyperEVM. Click "Retry Deposit" to complete the transfer.',
                };

            case 'NO_GAS':
                return {
                    icon: <GasIcon />,
                    title: 'Need Gas Tokens',
                    description: 'You need a small amount of HYPE (native token) to pay for transaction fees.',
                    primaryAction: {
                        label: 'Get Free HYPE',
                        onClick: () => {
                            window.open('https://app.hyperliquid.xyz/drip', '_blank');
                        },
                    },
                    secondaryAction: {
                        label: 'I Have HYPE Now',
                        onClick: onRetryDeposit,
                    },
                    helpText: '1. Get tokens from faucet. 2. Come back here. 3. Click "I Have HYPE Now".',
                };

            case 'BELOW_MINIMUM':
                return {
                    icon: <StopIcon />,
                    title: 'Amount Too Low',
                    description: 'Hyperliquid rejects deposits under $5.10. These transactions cannot be processed.',
                    primaryAction: {
                        label: 'Go Back',
                        onClick: () => {
                            reset();
                            onCancel();
                        },
                        variant: 'danger'
                    },
                    helpText: 'Protocol Rule: Minimum deposit is $5.10 to prevent spam.',
                };

            default:
                return null;
        }
    };

    const config = getErrorConfig(error);
    if (!config) return null;

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Glass Backdrop */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xl transition-all" />

            <div className="relative z-10 flex flex-col items-center max-w-[320px] text-center">
                {/* Icon */}
                <div className="mb-4 drop-shadow-sm">
                    {config.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-3 text-zinc-900 tracking-tight">{config.title}</h3>

                {/* Description */}
                <p className="text-zinc-500 text-[15px] leading-relaxed mb-6 font-medium">
                    {config.description}
                </p>

                {/* Help Text Box */}
                {config.helpText && (
                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl mb-8 w-full backdrop-blur-sm">
                        <div className="text-left">
                            <span className="text-zinc-500 text-xs font-medium leading-relaxed">
                                {config.helpText}
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={config.primaryAction.onClick}
                        className={`w-full py-3.5 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-sm
                            ${config.primaryAction.variant === 'danger'
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-black text-white hover:bg-zinc-800'}`}
                    >
                        {config.primaryAction.label}
                    </button>

                    {config.secondaryAction && (
                        <button
                            onClick={config.secondaryAction.onClick}
                            className="w-full py-3.5 rounded-xl font-bold text-[15px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50/50 transition-all active:scale-[0.98]"
                        >
                            {config.secondaryAction.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
