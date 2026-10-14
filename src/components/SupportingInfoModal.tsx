import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import TermsOfServicePage from './TermsOfServicePage';
import ContactPage from './ContactPage';

export type SupportingRoute = 'privacy' | 'terms' | 'contact';

interface SupportingInfoModalProps {
  route: SupportingRoute | null;
  onClose: () => void;
  onNavigate: (route: SupportingRoute) => void;
}

/**
 * SupportingInfoModal renders legal/support pages in a clean modal dialog.
 * Preserves page/form state underneath while enabling full document viewing.
 */
export default function SupportingInfoModal({
  route,
  onClose,
  onNavigate,
}: SupportingInfoModalProps) {
  useEffect(() => {
    if (!route) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [route, onClose]);

  if (!route) return null;

  const titleMap: Record<SupportingRoute, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contact: 'Contact Us',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleMap[route]}
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <h2 className="font-semibold text-base sm:text-lg tracking-tight">
            {titleMap[route]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 text-slate-700 dark:text-slate-300">
          {route === 'privacy' && <PrivacyPolicyPage onNavigate={onNavigate} />}
          {route === 'terms' && <TermsOfServicePage onNavigate={onNavigate} />}
          {route === 'contact' && <ContactPage />}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
