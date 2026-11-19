import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * Standard Design System Modal.
 * Subtle backdrop with level 2 surface-700 card and 1px surface-400 border.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full bg-surface-700 border border-surface-400 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-text-primary",
          maxWidthMap[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-surface-400/80">
            <div className="space-y-0.5 min-w-0 pr-4">
              {title && (
                <h3 className="text-base font-semibold text-text-primary tracking-tight truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-text-secondary leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-600 rounded-lg transition-colors border-0 cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
