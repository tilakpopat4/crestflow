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
 * Strictly adheres to GEMINI.md design standards: no emojis, restrained layout.
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
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Subject Line</label>
          <input
            type="text"
            placeholder="e.g. Exclusive Pro Plan Offer | CrestFlow"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Banner Tag (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Limited Offer"
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Campaign Headline</label>
        <input
          type="text"
          placeholder="e.g. Elevate Your Video Editing Business With CrestFlow Pro"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
        />
      </div>

      <div>
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
        <textarea
          rows={4}
          placeholder="Write your announcement or promotional offer details here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 leading-relaxed"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Button Label (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Upgrade to Pro"
            value={actionLabel}
            onChange={(e) => setActionLabel(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Button Target Link (Optional)</label>
          <input
            type="text"
            placeholder="https://crestflow.app/pricing"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 font-mono text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
