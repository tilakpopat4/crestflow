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
 * Adheres strictly to GEMINI.md design standards: dark studio palette, no emojis.
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
    <div className="bg-[#0B0B0E] p-4 sm:p-6 rounded-xl border border-[#2A2A33] space-y-4 text-white">
      {/* Fake Inbox Header */}
      <div className="border-b border-[#2A2A33] pb-3 text-xs space-y-1">
        <div className="flex gap-2">
          <span className="text-[#A1A1AA] font-medium w-16">Subject:</span>
          <span className="font-semibold text-white">{subject || '(No subject entered)'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[#A1A1AA] font-medium w-16">From:</span>
          <span className="text-[#A1A1AA] font-mono">CrestFlow &lt;support.crestflow@gmail.com&gt;</span>
        </div>
      </div>

      {/* Email Body Card */}
      <div className="bg-[#131318] rounded-lg p-5 sm:p-7 border border-[#2A2A33] max-w-lg mx-auto shadow-2xs space-y-4 text-[#F7F7F8] text-xs">
        {bannerText && (
          <div className="inline-block px-2.5 py-1 bg-[#1B1B22] border border-[#2A2A33] text-[#FF2D4A] text-[11px] font-semibold rounded uppercase tracking-wider">
            {bannerText}
          </div>
        )}

        <h3 className="text-base sm:text-lg font-bold text-white">
          {headline || 'Campaign Headline'}
        </h3>

        <p className="text-[#A1A1AA]">Hi Creator,</p>

        <div className="space-y-2 text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">
          {message || 'Compose your campaign announcement or promotional message here. It will render cleanly with proper line breaks and typography.'}
        </div>

        {actionLabel && (
          <div className="pt-2">
            <span className="inline-block px-4 py-2 bg-[#1B1B22] text-white rounded-lg text-xs font-semibold cursor-default">
              {actionLabel}
            </span>
            {actionUrl && (
              <p className="text-[10px] text-[#A1A1AA] font-mono mt-1 truncate">
                Target: {actionUrl}
              </p>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-[#2A2A33] text-[11px] text-[#A1A1AA]">
          <p>&mdash; The CrestFlow Team</p>
          <p className="mt-1 text-[10px] text-[#A1A1AA]">You are receiving this official update from CrestFlow.</p>
        </div>
      </div>
    </div>
  );
}
