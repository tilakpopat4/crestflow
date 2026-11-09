import React from 'react';
import Logo from './Logo';
import { useFooterConfig, FooterLink } from '../lib/footerConfig';

interface FooterProps {
  variant?: 'default' | 'minimal';
  onNavigate?: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing' | 'dashboard' | 'work' | 'reviews' | any) => void;
  className?: string;
  transparent?: boolean;
}

const renderSocialIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'x':
    case 'twitter':
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
        </svg>
      );
    case 'github':
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.994 24v-.001H24v-8.802c0-4.306-.927-7.623-5.961-7.623-2.42 0-4.044 1.328-4.707 2.587h-.07V7.976H8.489v16.023h4.97v-7.934c0-2.089.396-4.109 2.983-4.109 2.549 0 2.587 2.384 2.587 4.243V24zM.396 7.977h4.976V24H.396zM2.882 0C1.291 0 0 1.291 0 2.882s1.291 2.909 2.882 2.909 2.882-1.318 2.882-2.909A2.884 2.884 0 0 0 2.882 0" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    default:
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
};

/**
 * CrestFlow editable dynamic footer component.
 * Features official CrestFlow logo, custom editable hyperlinks, and real-time synchronization.
 */
export default function Footer({
  variant = 'default',
  onNavigate,
  className = '',
  transparent = false,
}: FooterProps) {
  const { config } = useFooterConfig();

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: FooterLink
  ) => {
    if (link.openInNewTab) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (link.url.startsWith('http') || link.url.startsWith('mailto:') || link.url === '#') {
      if (link.url === '#') e.preventDefault();
      return;
    }
    e.preventDefault();
    if (onNavigate && link.route) {
      onNavigate(link.route);
      return;
    }
    window.history.pushState({}, '', link.url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navLinkClass =
    'rounded-sm text-xs md:text-sm text-slate-400 transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-50';

  const bottomLinkClass =
    'rounded-sm whitespace-nowrap text-xs md:text-sm text-slate-400 transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-50';

  const socialLinkClass =
    'inline-flex size-7 md:size-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-[#333333] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-50';

  const brandLogo = (
    <a
      href="/"
      onClick={(e) => handleLinkClick(e, { id: 'home', name: config.brandName, url: '/', route: 'dashboard' })}
      className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-50 group"
    >
      <Logo className="w-6 h-6 md:w-7 md:h-7 rounded-lg shadow-xs group-hover:scale-105 transition-transform duration-150" />
      <span className="text-sm md:text-[15px] font-semibold tracking-tight text-white">
        {config.brandName}
      </span>
    </a>
  );

  const socialLinks = (
    <ul className="-ml-1.5 flex items-center gap-0.5 sm:-mr-2 sm:ml-0 md:gap-1">
      {config.socialLinks.map((item) => (
        <li key={item.id}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.name}
            className={socialLinkClass}
          >
            {renderSocialIcon(item.platform)}
          </a>
        </li>
      ))}
    </ul>
  );

  const legalLinks = (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 md:gap-x-4 md:gap-y-2 !bg-transparent border-none text-xs md:text-sm">
      {config.legalLinks.map((link) => (
        <li key={link.id} className="!bg-transparent border-none">
          <a
            href={link.url}
            target={link.openInNewTab ? '_blank' : undefined}
            rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
            onClick={(e) => handleLinkClick(e, link)}
            className={`${bottomLinkClass} !bg-transparent`}
          >
            {link.name}
          </a>
        </li>
      ))}
    </ul>
  );

  if (variant === 'minimal') {
    return (
      <footer
        aria-labelledby="ft-simple-title"
        className={`w-full transition-colors ${
          transparent
            ? 'bg-transparent text-white/80'
            : 'bg-[#282828] text-slate-400'
        } px-4 md:px-8 ${className}`}
      >
        <h2 id="ft-simple-title" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-2 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-sm sm:py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-2">
              <p className="text-slate-400">
                {config.copyrightText}{' '}
                {config.versionText && (
                  <span className="text-slate-500">&bull; Version {config.versionText}</span>
                )}
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
      className={`bg-[#282828] px-4 md:px-8 ${className}`}
    >
      <h2 id="ft-simple-title" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-2.5 py-3 md:gap-6 md:py-5 md:flex-row md:items-center md:justify-between">
          {brandLogo}
          <nav aria-label="Footer" className="!bg-transparent border-none">
            <ul className="flex flex-wrap gap-x-3.5 gap-y-1 md:gap-x-6 md:gap-y-3 !bg-transparent border-none">
              {config.primaryLinks.map((link) => (
                <li key={link.id} className="!bg-transparent border-none">
                  <a
                    href={link.url}
                    target={link.openInNewTab ? '_blank' : undefined}
                    rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                    onClick={(e) => handleLinkClick(e, link)}
                    className={`${navLinkClass} !bg-transparent`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-[#333333] py-2.5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-sm sm:py-3.5 md:gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-2">
            <p className="text-slate-400">
              {config.copyrightText}{' '}
              {config.versionText && (
                <span className="text-slate-500">&bull; Version {config.versionText}</span>
              )}
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
