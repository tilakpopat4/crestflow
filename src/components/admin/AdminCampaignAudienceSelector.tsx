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
 * Strictly adheres to GEMINI.md design standards: dark grey selection, no emojis, flat aesthetic.
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
    <div className="p-3.5 bg-[#181818] rounded-lg space-y-2.5 border border-[#2e2e2e]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>Target Audience Cohort</span>
        </div>
        <span className="text-[11px] font-mono text-indigo-400 font-semibold">
          {targetedCount} Recipient{targetedCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((aud) => (
          <button
            key={aud.id}
            type="button"
            onClick={() => setAudienceType(aud.id)}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors duration-120 ${
              audienceType === aud.id
                ? 'bg-[#282828] text-white border-[#444444] shadow-xs'
                : 'bg-[#1e1e1e] border-[#2a2a2a] text-slate-400 hover:text-white hover:bg-[#242424]'
            }`}
          >
            <div className={`font-semibold text-xs ${audienceType === aud.id ? 'text-white' : 'text-slate-300'}`}>
              {aud.label}
            </div>
            {aud.count !== null && (
              <div className="text-[10px] text-slate-500 mt-0.5">{aud.count} accounts</div>
            )}
          </button>
        ))}
      </div>

      {audienceType === 'custom' && (
        <textarea
          rows={2}
          placeholder="Enter email addresses separated by commas or lines..."
          value={customEmails}
          onChange={(e) => setCustomEmails(e.target.value)}
          className="w-full p-2.5 bg-[#1e1e1e] border border-[#333333] rounded-lg text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 font-mono text-[11px]"
        />
      )}
    </div>
  );
}
