import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface ActivatingPaymentModalProps {
  userId: string;
  isOpen: boolean;
  onActivated: () => void;
  onClose?: () => void;
}

/**
 * Activating state listening directly to Firestore subscriptions/{uid}
 * for webhook confirmation after Razorpay checkout submission.
 */
export const ActivatingPaymentModal: React.FC<ActivatingPaymentModalProps> = ({
  userId,
  isOpen,
  onActivated,
  onClose,
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen || !userId) return;

    setIsConfirmed(false);
    setElapsedSeconds(0);

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    // Listen to the authoritative subscription document
    const unsub = onSnapshot(
      doc(db, 'subscriptions', userId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const nowMs = Date.now();
          const accessUntilMs = data.accessUntil ? new Date(data.accessUntil).getTime() : 0;

          if (
            (data.status === 'trialing' || data.status === 'active') &&
            accessUntilMs > nowMs
          ) {
            setIsConfirmed(true);
          }
        }
      },
      (err) => console.warn('[ActivatingPaymentModal] Firestore listener warning:', err)
    );

    return () => {
      clearInterval(timer);
      unsub();
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm text-center">
        {!isConfirmed ? (
          <div>
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
              Activating your membership…
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              We received your payment verification and are syncing your workspace access with the payment gateway.
            </p>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Waiting for webhook confirmation ({elapsedSeconds}s)…
            </div>
          </div>
        ) : (
          <div>
            <div className="w-8 h-8 mx-auto mb-4 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm">
              ✓
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
              Membership Activated
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Your access has been confirmed. Full write access to client management, automated invoicing, and UPI payment tracking is now unlocked.
            </p>
            <button
              type="button"
              onClick={onActivated}
              className="w-full py-2.5 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors cursor-pointer border-none"
            >
              Continue to Workspace
            </button>
          </div>
        )}

        {elapsedSeconds > 25 && !isConfirmed && onClose && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer bg-transparent border-none"
            >
              Dismiss and check status in background
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
