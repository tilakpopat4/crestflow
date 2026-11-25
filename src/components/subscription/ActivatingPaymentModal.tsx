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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-surface-700 rounded-xl border border-surface-400 p-6 shadow-xl text-center text-text-primary">
        {!isConfirmed ? (
          <div>
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <h3 className="text-base font-semibold text-text-primary mb-2">
              Activating your membership…
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              We received your payment verification and are syncing your workspace access with the payment gateway.
            </p>
            <div className="text-[11px] text-text-muted">
              Waiting for webhook confirmation ({elapsedSeconds}s)…
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-base font-semibold text-text-primary mb-2">
              Membership Active
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-6">
              Workspace access unlocked.
            </p>
            <button
              type="button"
              onClick={onActivated}
              className="w-full py-2.5 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors cursor-pointer border-0"
            >
              Continue
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
