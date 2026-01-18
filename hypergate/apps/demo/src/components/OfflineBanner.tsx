import { useEffect, useState } from 'react';
import { useNetworkStatus } from '../hooks/usePWA';

/**
 * Offline banner that appears when the user loses connectivity
 */
export function OfflineBanner() {
  const { isOffline, wasOffline, isOnline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOffline && !showReconnected) return null;

  return (
    <div 
      className={`
        fixed top-0 left-0 right-0 z-[100] 
        flex items-center justify-center gap-2 
        px-4 py-3 
        text-sm font-medium
        transition-all duration-300
        ${isOffline 
          ? 'bg-red-500 text-white' 
          : 'bg-green-500 text-white'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span>You're offline. Some features may be unavailable.</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Back online!</span>
        </>
      )}
    </div>
  );
}

/**
 * Update available banner
 */
interface UpdateBannerProps {
  onUpdate: () => void;
}

export function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  return (
    <div 
      className="
        fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80
        z-[100]
        flex items-center justify-between gap-3
        px-4 py-3
        bg-purple-600 text-white
        rounded-xl shadow-xl
        animate-in slide-in-from-bottom-4 duration-300
      "
      role="alert"
    >
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-sm font-medium">Update available</span>
      </div>
      <button
        onClick={onUpdate}
        className="min-h-[36px] px-3 py-1.5 bg-white text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-50 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}
