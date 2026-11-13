import React from 'react';

interface AdminCampaignPreviewProps {
  subject: string;
  headline: string;
  message: string;
  bannerText?: string;
  actionLabel?: string;
  actionUrl?: string;
}

/**
 * AdminCampaignPreview renders a live inbox preview of the promotional email.
 * Adheres strictly to GEMINI.md design standards: no emojis, restrained layout.
 */
export default function AdminCampaignPreview({
  subject,
  headline,
  message,
  bannerText,
  actionLabel,
  actionUrl,
}: AdminCampaignPreviewProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
      {/* Fake Inbox Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 text-xs space-y-1">
        <div className="flex gap-2">
          <span className="text-slate-400 font-medium w-16">Subject:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{subject || '(No subject entered)'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-400 font-medium w-16">From:</span>
          <span className="text-slate-600 dark:text-slate-300 font-mono">CrestFlow &lt;support.crestflow@gmail.com&gt;</span>
        </div>
      </div>

      {/* Email Body Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-5 sm:p-7 border border-slate-200 dark:border-slate-800 max-w-lg mx-auto shadow-2xs space-y-4 text-slate-800 dark:text-slate-200 text-xs">
        {bannerText && (
          <div className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold rounded uppercase tracking-wider">
            {bannerText}
          </div>
        )}

        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
          {headline || 'Campaign Headline'}
        </h3>

        <p className="text-slate-600 dark:text-slate-400">Hi Creator,</p>

        <div className="space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {message || 'Compose your campaign announcement or promotional message here. It will render cleanly with proper line breaks and typography.'}
        </div>

        {actionLabel && (
          <div className="pt-2">
            <span className="inline-block px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold cursor-default">
              {actionLabel}
            </span>
            {actionUrl && (
              <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                Target: {actionUrl}
              </p>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          <p>&mdash; The CrestFlow Team</p>
          <p className="mt-1 text-[10px] text-slate-400">You are receiving this official update from CrestFlow.</p>
        </div>
      </div>
    </div>
  );
}
