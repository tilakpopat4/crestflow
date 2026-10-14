import React from 'react';

interface FooterProps {
  variant?: 'default' | 'minimal';
  onNavigate?: (route: 'privacy' | 'terms' | 'contact') => void;
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
    route: 'privacy' | 'terms' | 'contact'
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
        <div className={`max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs ${
          transparent ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
        }`}>
          <span>&copy; {currentYear} CrestFlow. All rights reserved.</span>
          <nav aria-label="Footer" className="flex items-center gap-6">
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy', 'privacy')}
              className={`text-xs hover:underline transition-colors focus:outline-none ${
                transparent ? 'text-white/80 hover:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Privacy Policy
            </a>
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact', 'contact')}
              className={`text-xs hover:underline transition-colors focus:outline-none ${
                transparent ? 'text-white/80 hover:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Row 1 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              CrestFlow
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Freelancing client manager
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy', 'privacy')}
              className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, '/terms', 'terms')}
              className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Terms of Service
            </a>
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact', 'contact')}
              className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Contact Us
            </a>
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact', 'contact')}
              className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline transition-colors focus:outline-none"
            >
              Support
            </a>
          </nav>
        </div>

        {/* Row 2 */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>&copy; {currentYear} CrestFlow. All rights reserved.</span>
          <span>Version {appVersion}</span>
        </div>
      </div>
    </footer>
  );
}
