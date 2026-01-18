import { useCallback } from 'react';

/**
 * Hook for haptic feedback on mobile devices
 * Uses the Vibration API when available
 */
export function useHaptics() {
  const vibrate = useCallback((pattern: number | number[] = 50) => {
    // Check if vibration is supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently fail - vibration not critical
        console.debug('[Haptics] Vibration failed:', e);
      }
    }
  }, []);

  // Predefined haptic patterns
  const haptics = {
    /** Light tap - for button presses */
    tap: () => vibrate(50),
    
    /** Success - for completed actions */
    success: () => vibrate([50, 50, 100]),
    
    /** Error - for failed actions */
    error: () => vibrate([100, 50, 100, 50, 100]),
    
    /** Warning - for confirmations */
    warning: () => vibrate([50, 100, 50]),
    
    /** Selection - for toggles/selections */
    selection: () => vibrate(30),
    
    /** Impact - for significant actions */
    impact: () => vibrate(100),
    
    /** Custom pattern */
    custom: vibrate,
  };

  return haptics;
}

/**
 * HOC wrapper for adding haptic feedback to any click handler
 */
 
export function withHaptics<T extends (...args: unknown[]) => unknown>(
  handler: T,
  pattern: number | number[] = 50
): T {
  return ((...args: Parameters<T>) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_e) {
        // Silently fail
      }
    }
    return handler(...args);
  }) as T;
}
