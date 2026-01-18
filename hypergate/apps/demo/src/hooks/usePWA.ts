import { useState, useEffect, useCallback } from 'react';

export type NetworkStatus = 'online' | 'offline';

/**
 * Hook to detect network connectivity status
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      if (wasOffline) {
        // Trigger a sync when coming back online
        console.log('[Network] Back online');
      }
    };

    const handleOffline = () => {
      setStatus('offline');
      setWasOffline(true);
      console.log('[Network] Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { status, isOnline: status === 'online', isOffline: status === 'offline', wasOffline };
}

/**
 * Hook to manage service worker registration and updates
 */
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered:', reg.scope);
          setRegistration(reg);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });

      // Handle controller change (after update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const skipWaiting = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration]);

  const notifyTransactionComplete = useCallback((txHash: string, amount: string) => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TRANSACTION_COMPLETE',
        txHash,
        amount
      });
    }
  }, []);

  return { 
    registration, 
    updateAvailable, 
    skipWaiting,
    notifyTransactionComplete
  };
}

/**
 * Hook to request push notification permissions
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('[Push] Notifications not supported');
      return 'denied' as NotificationPermission;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, requestPermission };
}
