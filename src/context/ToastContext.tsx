import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Provides lightweight, accessible non-blocking toast notifications aligned with Section 9 tokens.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    }
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((toast) => {
          const icon =
            toast.tone === 'success' ? (
              <CheckCircle2 size={15} className="text-[#2DD4A0] shrink-0" />
            ) : toast.tone === 'warning' ? (
              <AlertCircle size={15} className="text-[#FFB020] shrink-0" />
            ) : toast.tone === 'error' ? (
              <AlertCircle size={15} className="text-[#F0607A] shrink-0" />
            ) : (
              <Info size={15} className="text-[#A1A1AA] shrink-0" />
            );

          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg bg-[#1B1B22] border border-[#2A2A33] px-3.5 py-2.5 text-xs text-[#F7F7F8]"
            >
              <span className="mt-0.5">{icon}</span>
              <span className="flex-1 leading-relaxed">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-[#A1A1AA] hover:text-[#F7F7F8] bg-transparent border-0 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook for displaying non-blocking toast messages anywhere inside ToastProvider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      dismissToast: () => {},
    };
  }
  return ctx;
}
