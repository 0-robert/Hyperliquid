import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to manage reduced motion preferences
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    return undefined;
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to prevent pull-to-refresh on mobile
 */
export function usePreventPullToRefresh() {
  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].pageY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].pageY;
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      
      // If at top of page and pulling down, prevent default
      if (scrollTop <= 0 && y > startY) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Also set CSS to disable overscroll
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.body.style.overscrollBehavior = '';
    };
  }, []);
}

/**
 * Hook to copy text to clipboard
 */
export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error('[Clipboard] Copy failed:', error);
      return false;
    }
  }, []);

  return { copy, copied };
}
