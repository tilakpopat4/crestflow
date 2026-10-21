import React from 'react';

interface FooterProps {
  variant?: 'default' | 'minimal';
  onNavigate?: (route: 'privacy' | 'terms' | 'contact' | 'refund') => void;
  className?: string;
  transparent?: boolean;
}

export default function Footer({
  variant = 'default',
  onNavigate,
  className = '',
  transparent = false,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const appVersion = '0.0.0';

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
    route: 'privacy' | 'terms' | 'contact' | 'refund'
  ) => {
    // Allow opening in new tab via Ctrl/Cmd/middle click
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (onNavigate) {
      onNavigate(route);
      return;
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (variant === 'minimal') {
    return (
      <footer
        className={`w-full transition-colors ${
          transparent
            ? 'border-t border-white/20 bg-transparent text-white/80'
            : 'border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
        } ${className}`}
      >
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm ${
          transparent ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'
        }`}>
          <span>&copy; {currentYear} CrestFlow. All rights reserved.</span>
          <nav aria-label="Footer" className="flex items-center gap-6">
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy', 'privacy')}
              className={`text-sm font-medium hover:underline transition-colors focus:outline-none ${
                transparent ? 'text-white/80 hover:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Privacy Policy
            </a>
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact', 'contact')}
              className={`text-sm font-medium hover:underline transition-colors focus:outline-none ${
                transparent ? 'text-white/80 hover:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Contact Us
            </a>
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Row 1 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              CrestFlow
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Freelancing client manager
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-3.5 sm:gap-x-6 gap-y-1.5 sm:gap-y-2">
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy', 'privacy')}
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, '/terms', 'terms')}
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Terms of Service
            </a>
            <a
              href="/refund"
              onClick={(e) => handleLinkClick(e, '/refund', 'refund')}
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Cancellation &amp; Refund
            </a>
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact', 'contact')}
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Contact Us
            </a>
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact', 'contact')}
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Support
            </a>
          </nav>
        </div>

        {/* Row 2 */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between gap-2 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>&copy; {currentYear} CrestFlow. All rights reserved.</span>
          <span>Version {appVersion}</span>
        </div>
      </div>
    </footer>
  );
}
