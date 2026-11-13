import React from 'react';

interface AdminCampaignFormInputsProps {
  subject: string;
  setSubject: (v: string) => void;
  bannerText: string;
  setBannerText: (v: string) => void;
  headline: string;
  setHeadline: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  actionLabel: string;
  setActionLabel: (v: string) => void;
  actionUrl: string;
  setActionUrl: (v: string) => void;
}

/**
 * AdminCampaignFormInputs encapsulates campaign content input controls.
 * Strictly adheres to GEMINI.md design standards: dark studio palette, no emojis.
 */
export default function AdminCampaignFormInputs({
  subject,
  setSubject,
  bannerText,
  setBannerText,
  headline,
  setHeadline,
  message,
  setMessage,
  actionLabel,
  setActionLabel,
  actionUrl,
  setActionUrl,
}: AdminCampaignFormInputsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block font-medium text-slate-300 mb-1 text-xs">Subject Line</label>
          <input
            type="text"
            placeholder="e.g. Exclusive Pro Plan Offer | CrestFlow"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 bg-[#181818] border border-[#333333] rounded-lg text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 text-xs"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-300 mb-1 text-xs">Banner Tag (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Limited Offer"
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            className="w-full p-2 bg-[#181818] border border-[#333333] rounded-lg text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 text-xs"
          />
        </div>
      </div>

      <div>
        <label className="block font-medium text-slate-300 mb-1 text-xs">Campaign Headline</label>
        <input
          type="text"
          placeholder="e.g. Elevate Your Video Editing Business With CrestFlow Pro"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="w-full p-2 bg-[#181818] border border-[#333333] rounded-lg text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 text-xs"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-300 mb-1 text-xs">Message Body</label>
        <textarea
          rows={4}
          placeholder="Write your announcement or promotional offer details here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 bg-[#181818] border border-[#333333] rounded-lg text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 leading-relaxed text-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-300 mb-1 text-xs">Button Label (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Upgrade to Pro"
            value={actionLabel}
            onChange={(e) => setActionLabel(e.target.value)}
            className="w-full p-2 bg-[#181818] border border-[#333333] rounded-lg text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 text-xs"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-300 mb-1 text-xs">Button Target Link (Optional)</label>
          <input
            type="text"
            placeholder="https://crestflow.app/pricing"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            className="w-full p-2 bg-[#181818] border border-[#333333] rounded-lg text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 font-mono text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
