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
    <div className="p-3.5 bg-[#0B0B0E] rounded-lg space-y-2.5 border border-[#2A2A33]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-[#F7F7F8]">
          <Users className="w-3.5 h-3.5 text-[#A1A1AA]" />
          <span>Target Audience Cohort</span>
        </div>
        <span className="text-[11px] font-mono text-[#FF2D4A] font-semibold">
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
                ? 'bg-[#1B1B22] text-white border-[#2A2A33] shadow-xs'
                : 'bg-[#131318] border-[#2A2A33] text-[#A1A1AA] hover:text-white hover:bg-[#1B1B22]'
            }`}
          >
            <div className={`font-semibold text-xs ${audienceType === aud.id ? 'text-white' : 'text-[#A1A1AA]'}`}>
              {aud.label}
            </div>
            {aud.count !== null && (
              <div className="text-[10px] text-[#A1A1AA] mt-0.5">{aud.count} accounts</div>
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
          className="w-full p-2.5 bg-[#131318] border border-[#2A2A33] rounded-lg text-white placeholder:text-[#A1A1AA] outline-none focus:border-[#FF2D4A] font-mono text-[11px]"
        />
      )}
    </div>
  );
}
