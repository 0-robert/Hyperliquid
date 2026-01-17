import { useState } from 'react';

interface DemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number) => void;
}

export function DemoModal({ isOpen, onClose, onSubmit }: DemoModalProps) {
    const [amount, setAmount] = useState('7.00');
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = () => {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (parsed > 10000) {
            setError('Maximum demo amount is $10,000');
            return;
        }
        onSubmit(parsed);
    };

    const presetAmounts = [5, 10, 25, 100];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Demo Bridge</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                    Enter a simulated amount to test the bridge flow without real funds.
                </p>

                {/* Quick Presets */}
                <div className="flex gap-2 mb-4">
                    {presetAmounts.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => setAmount(preset.toString())}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                                ${amount === preset.toString()
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            ${preset}
                        </button>
                    ))}
                </div>

                {/* Custom Amount Input */}
                <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setError(null);
                        }}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-4 bg-black/50 border border-white/10 rounded-xl text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        min="0"
                        step="0.01"
                    />
                </div>

                {error && (
                    <p className="text-red-400 text-sm mb-4">{error}</p>
                )}

                {/* Info Box */}
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-6">
                    <p className="text-yellow-200 text-xs">
                        <span className="font-semibold">Tip:</span> Try amounts below $5.10 to see the Safety Guard warning for burns.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium text-white transition-colors active:scale-[0.98]"
                    >
                        Start Demo
                    </button>
                </div>
            </div>
        </div>
    );
}
