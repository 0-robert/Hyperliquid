import { useEffect, useState, useCallback } from 'react';

export interface DeepLinkParams {
  action?: string;
  token?: string;
  amount?: string;
  chain?: string;
  tx?: string;
  deeplink?: string;
}

/**
 * Hook to handle deep links and URL parameters
 * Supports:
 * - Query params: /?action=bridge&token=USDC&amount=100
 * - Protocol: web+hypergate://bridge?token=USDC
 */
export function useDeepLinks() {
  const [params, setParams] = useState<DeepLinkParams>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse URL parameters
  const parseParams = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const parsed: DeepLinkParams = {};

    // Standard params
    if (urlParams.has('action')) parsed.action = urlParams.get('action')!;
    if (urlParams.has('token')) parsed.token = urlParams.get('token')!;
    if (urlParams.has('amount')) parsed.amount = urlParams.get('amount')!;
    if (urlParams.has('chain')) parsed.chain = urlParams.get('chain')!;
    if (urlParams.has('tx')) parsed.tx = urlParams.get('tx')!;

    // Handle protocol deep link
    if (urlParams.has('deeplink')) {
      try {
        const deeplink = decodeURIComponent(urlParams.get('deeplink')!);
        // Parse: web+hypergate://action?params
        const match = deeplink.match(/web\+hypergate:\/\/(\w+)\??(.*)/);
        if (match) {
          parsed.action = match[1];
          const deeplinkParams = new URLSearchParams(match[2]);
          if (deeplinkParams.has('token')) parsed.token = deeplinkParams.get('token')!;
          if (deeplinkParams.has('amount')) parsed.amount = deeplinkParams.get('amount')!;
          if (deeplinkParams.has('chain')) parsed.chain = deeplinkParams.get('chain')!;
        }
      } catch (e) {
        console.error('[DeepLink] Failed to parse:', e);
      }
    }

    return parsed;
  }, []);

  useEffect(() => {
    const parsed = parseParams();
    if (Object.keys(parsed).length > 0) {
      setParams(parsed);
      setIsProcessing(true);
      console.log('[DeepLink] Parsed params:', parsed);
    }
  }, [parseParams]);

  // Clear the URL params after processing (keeps URL clean)
  const clearParams = useCallback(() => {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
    setIsProcessing(false);
    setParams({});
  }, []);

  // Generate a deep link URL
  const generateDeepLink = useCallback((action: string, params: Record<string, string>) => {
    const base = window.location.origin;
    const query = new URLSearchParams({ action, ...params }).toString();
    return `${base}/?${query}`;
  }, []);

  // Generate protocol deep link
  const generateProtocolLink = useCallback((action: string, params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return `web+hypergate://${action}?${query}`;
  }, []);

  return {
    params,
    isProcessing,
    clearParams,
    generateDeepLink,
    generateProtocolLink,
    hasParams: Object.keys(params).length > 0
  };
}
