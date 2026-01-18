import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeConnectProps {
  uri: string;
  size?: number;
  className?: string;
}

/**
 * QR Code component for WalletConnect URIs
 * Allows desktop users to scan with their mobile wallet
 */
export function QRCodeConnect({ uri, size = 200, className = '' }: QRCodeConnectProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!uri) return;

    QRCode.toDataURL(uri, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch((err) => {
        console.error('[QR] Generation failed:', err);
        setError('Failed to generate QR code');
      });
  }, [uri, size]);

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 bg-zinc-100 rounded-2xl ${className}`}>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div 
        className={`flex items-center justify-center bg-zinc-100 rounded-2xl animate-pulse ${className}`}
        style={{ width: size, height: size }}
      >
        <svg className="w-8 h-8 text-zinc-300 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <img 
        src={qrDataUrl} 
        alt="Scan with your mobile wallet"
        width={size}
        height={size}
        className="rounded-2xl shadow-lg"
      />
      {/* Logo overlay in center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center">
          <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface QRCodeModalProps {
  uri: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal wrapper for QR code display
 */
export function QRCodeModal({ uri, isOpen, onClose }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-zinc-900">Scan to Connect</h3>
          <p className="text-sm text-zinc-600">
            Open your mobile wallet and scan this QR code
          </p>
          
          <div className="flex justify-center py-4">
            <QRCodeConnect uri={uri} size={240} />
          </div>
          
          <div className="flex items-center gap-2 justify-center text-xs text-zinc-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure connection via WalletConnect</span>
          </div>
          
          <button
            onClick={onClose}
            className="
              w-full min-h-[48px]
              px-6 py-3
              border border-zinc-200
              text-zinc-700
              rounded-full
              font-medium
              hover:bg-zinc-50
              transition-all active:scale-95
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
