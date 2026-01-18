import { useClipboard } from '../hooks/useMobileUtils';
import { useHaptics } from '../hooks/useHaptics';

interface CopyTxButtonProps {
  txHash: string;
  className?: string;
  variant?: 'inline' | 'button' | 'icon';
}

/**
 * Copy transaction hash button with feedback
 */
export function CopyTxButton({ txHash, className = '', variant = 'button' }: CopyTxButtonProps) {
  const { copy, copied } = useClipboard();
  const haptics = useHaptics();

  const handleCopy = async () => {
    const success = await copy(txHash);
    if (success) {
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const truncatedHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        className={`
          min-h-[44px] min-w-[44px] 
          p-2 rounded-lg 
          text-zinc-500 hover:text-black hover:bg-zinc-100
          transition-all active:scale-95
          ${className}
        `}
        title="Copy transaction hash"
        aria-label="Copy transaction hash"
      >
        {copied ? (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleCopy}
        className={`
          inline-flex items-center gap-1.5
          px-2 py-1 
          text-xs font-mono
          bg-zinc-100 hover:bg-zinc-200 
          rounded-md
          transition-all active:scale-95
          ${className}
        `}
        title="Click to copy"
      >
        <span>{truncatedHash}</span>
        {copied ? (
          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleCopy}
      className={`
        min-h-[44px]
        flex items-center justify-center gap-2
        px-4 py-2
        text-sm font-medium
        bg-zinc-100 hover:bg-zinc-200 
        text-zinc-700
        rounded-xl
        transition-all active:scale-95
        ${className}
      `}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy TX Hash</span>
        </>
      )}
    </button>
  );
}

interface ErrorWithCopyProps {
  message: string;
  txHash?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Error display with copy TX hash for support
 */
export function ErrorWithCopy({ message, txHash, onRetry, onDismiss }: ErrorWithCopyProps) {
  const haptics = useHaptics();

  return (
    <div className="p-6 space-y-4 text-center">
      {/* Error icon */}
      <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      {/* Error message */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-zinc-900">Transaction Failed</h3>
        <p className="text-sm text-zinc-600">{message}</p>
      </div>

      {/* TX Hash copy (if available) */}
      {txHash && (
        <div className="pt-2">
          <p className="text-xs text-zinc-500 mb-2">Copy this for support:</p>
          <CopyTxButton txHash={txHash} variant="inline" className="mx-auto" />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {onRetry && (
          <button
            onClick={() => {
              haptics.tap();
              onRetry();
            }}
            className="
              min-h-[48px] flex-1
              flex items-center justify-center gap-2
              px-6 py-3
              bg-black text-white
              rounded-full
              font-semibold
              hover:bg-zinc-800
              transition-all active:scale-95
            "
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        )}
        {onDismiss && (
          <button
            onClick={() => {
              haptics.tap();
              onDismiss();
            }}
            className="
              min-h-[48px] flex-1
              px-6 py-3
              border border-zinc-200
              text-zinc-700
              rounded-full
              font-medium
              hover:bg-zinc-50
              transition-all active:scale-95
            "
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
