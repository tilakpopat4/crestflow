import React from 'react';
import { Users } from 'lucide-react';
import { AdminUserUnified } from '../../hooks/useAdminUsersAndHistory';

export type AudienceType = 'all' | 'active' | 'inactive' | 'custom';

interface AdminCampaignAudienceSelectorProps {
  audienceType: AudienceType;
  setAudienceType: (aud: AudienceType) => void;
  customEmails: string;
  setCustomEmails: (emails: string) => void;
  users: AdminUserUnified[];
  targetedCount: number;
}

/**
 * AdminCampaignAudienceSelector handles user cohort segmentation and custom recipient input.
 * Strictly adheres to GEMINI.md design standards: no emojis, flat aesthetic.
 */
export default function AdminCampaignAudienceSelector({
  audienceType,
  setAudienceType,
  customEmails,
  setCustomEmails,
  users,
  targetedCount,
}: AdminCampaignAudienceSelectorProps) {
  const options = [
    { id: 'all' as AudienceType, label: 'All Users', count: users.length },
    { id: 'active' as AudienceType, label: 'Active Pro', count: users.filter((u) => u.subscription_status === 'active').length },
    { id: 'inactive' as AudienceType, label: 'Trial / Free', count: users.filter((u) => u.subscription_status !== 'active').length },
    { id: 'custom' as AudienceType, label: 'Custom List', count: null },
  ];

  return (
    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-2.5 border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Target Audience Cohort</span>
        </div>
        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
          {targetedCount} Recipient{targetedCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((aud) => (
          <button
            key={aud.id}
            type="button"
            onClick={() => setAudienceType(aud.id)}
            className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
              audienceType === aud.id
                ? 'bg-[#282828] text-white border-[#3a3a3a] shadow-xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <div className="font-semibold">{aud.label}</div>
            {aud.count !== null && <div className="text-[10px] text-slate-400">{aud.count} accounts</div>}
          </button>
        ))}
      </div>

      {audienceType === 'custom' && (
        <textarea
          rows={2}
          placeholder="Enter email addresses separated by commas or lines..."
          value={customEmails}
          onChange={(e) => setCustomEmails(e.target.value)}
          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 font-mono text-[11px]"
        />
      )}
    </div>
  );
}
