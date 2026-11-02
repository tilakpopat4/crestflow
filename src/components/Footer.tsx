import React from 'react';

interface FooterProps {
  variant?: 'default' | 'minimal';
  onNavigate?: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing' | 'dashboard' | 'work' | 'reviews' | any) => void;
  className?: string;
  transparent?: boolean;
}

/**
 * CrestFlow standard footer component.
 * Features clean 2-tier layout, responsive navigation, legal links, and social links.
 */
export default function Footer({
  variant = 'default',
  onNavigate,
  className = '',
  transparent = false,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const appVersion = '1.1.0';

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
    route?: string
  ) => {
    // Allow opening in new tab via Ctrl/Cmd/middle click
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (path.startsWith('http') || path === '#') {
      if (path === '#') e.preventDefault();
      return;
    }
    e.preventDefault();
    if (onNavigate && route) {
      onNavigate(route);
      return;
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navLinkClass =
    'rounded-sm text-sm text-neutral-600 transition-colors duration-150 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:text-neutral-400 dark:hover:text-neutral-50 dark:focus-visible:outline-zinc-50';

  const bottomLinkClass =
    'rounded-sm whitespace-nowrap transition-colors duration-150 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:hover:text-neutral-50 dark:focus-visible:outline-zinc-50';

  const socialLinkClass =
    'inline-flex size-8 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 dark:focus-visible:outline-zinc-50';

  const brandLogo = (
    <a
      href="/"
      onClick={(e) => handleLinkClick(e, '/', 'dashboard')}
      className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:focus-visible:outline-zinc-50"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-neutral-50 dark:text-neutral-950">
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
          <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
          <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
        CrestFlow
      </span>
    </a>
  );

  const socialLinks = (
    <ul className="-ml-2 flex items-center gap-1 sm:-mr-2 sm:ml-0">
      <li>
        <a
          href="https://x.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CrestFlow on X"
          className={socialLinkClass}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
          </svg>
        </a>
      </li>
      <li>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CrestFlow on GitHub"
          className={socialLinkClass}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </a>
      </li>
      <li>
        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CrestFlow on LinkedIn"
          className={socialLinkClass}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.994 24v-.001H24v-8.802c0-4.306-.927-7.623-5.961-7.623-2.42 0-4.044 1.328-4.707 2.587h-.07V7.976H8.489v16.023h4.97v-7.934c0-2.089.396-4.109 2.983-4.109 2.549 0 2.587 2.384 2.587 4.243V24zM.396 7.977h4.976V24H.396zM2.882 0C1.291 0 0 1.291 0 2.882s1.291 2.909 2.882 2.909 2.882-1.318 2.882-2.909A2.884 2.884 0 0 0 2.882 0" />
          </svg>
        </a>
      </li>
      <li>
        <a
          href="https://youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CrestFlow on YouTube"
          className={socialLinkClass}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </a>
      </li>
    </ul>
  );

  const legalLinks = (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      <li>
        <a
          href="/privacy"
          onClick={(e) => handleLinkClick(e, '/privacy', 'privacy')}
          className={bottomLinkClass}
        >
          Privacy
        </a>
      </li>
      <li>
        <a
          href="/terms"
          onClick={(e) => handleLinkClick(e, '/terms', 'terms')}
          className={bottomLinkClass}
        >
          Terms
        </a>
      </li>
      <li>
        <a
          href="/refund"
          onClick={(e) => handleLinkClick(e, '/refund', 'refund')}
          className={bottomLinkClass}
        >
          Refund Policy
        </a>
      </li>
      <li>
        <a
          href="/terms"
          onClick={(e) => handleLinkClick(e, '/terms', 'terms')}
          className={bottomLinkClass}
        >
          Cookies
        </a>
      </li>
    </ul>
  );

  if (variant === 'minimal') {
    return (
      <footer
        aria-labelledby="ft-simple-title"
        className={`w-full border-t transition-colors ${
          transparent
            ? 'border-white/20 bg-transparent text-white/80'
            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950'
        } px-4 md:px-8 ${className}`}
      >
        <h2 id="ft-simple-title" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 py-6 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between dark:text-neutral-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p>
                &copy; {currentYear} CrestFlow Inc.{' '}
                <span className="opacity-70">&bull; Version {appVersion}</span>
              </p>
              {legalLinks}
            </div>
            {socialLinks}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      aria-labelledby="ft-simple-title"
      className={`border-t border-neutral-200 bg-white px-4 md:px-8 dark:border-neutral-800 dark:bg-neutral-950 ${className}`}
    >
      <h2 id="ft-simple-title" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-6 py-10 md:flex-row md:items-center md:justify-between">
          {brandLogo}
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              <li>
                <a
                  href="/"
                  onClick={(e) => handleLinkClick(e, '/', 'dashboard')}
                  className={navLinkClass}
                >
                  Product
                </a>
              </li>
              <li>
                <a
                  href="/work"
                  onClick={(e) => handleLinkClick(e, '/work', 'work')}
                  className={navLinkClass}
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="/pricing"
                  onClick={(e) => handleLinkClick(e, '/pricing', 'pricing')}
                  className={navLinkClass}
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="/reviews"
                  onClick={(e) => handleLinkClick(e, '/reviews', 'reviews')}
                  className={navLinkClass}
                >
                  Customers
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => handleLinkClick(e, '/terms', 'terms')}
                  className={navLinkClass}
                >
                  Docs
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact', 'contact')}
                  className={navLinkClass}
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-4 border-t border-neutral-200 py-6 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p>
              &copy; {currentYear} CrestFlow Inc.{' '}
              <span className="opacity-70">&bull; Version {appVersion}</span>
            </p>
            {legalLinks}
          </div>
          {socialLinks}
        </div>
      </div>
    </footer>
  );
}

export { Footer as SimpleFooter };
