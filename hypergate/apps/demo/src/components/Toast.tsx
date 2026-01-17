import { useEffect, useState } from 'react';

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const TOAST_CONFIG = {
    success: {
        bg: 'bg-green-500/10 border-green-500/30',
        text: 'text-green-400',
        icon: '✓',
    },
    error: {
        bg: 'bg-red-500/10 border-red-500/30',
        text: 'text-red-400',
        icon: '✕',
    },
    info: {
        bg: 'bg-blue-500/10 border-blue-500/30',
        text: 'text-blue-400',
        icon: 'ℹ',
    },
};

function Toast({ toast, onDismiss }: ToastProps) {
    const config = TOAST_CONFIG[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 5000);

        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg animate-slide-in ${config.bg}`}
        >
            <span className={`text-lg ${config.text}`}>{config.icon}</span>
            <p className={`text-sm ${config.text}`}>{toast.message}</p>
            <button
                onClick={() => onDismiss(toast.id)}
                className={`ml-2 ${config.text} hover:opacity-70 transition-opacity`}
            >
                ✕
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

// Hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, addToast, dismissToast };
}

export default ToastContainer;
