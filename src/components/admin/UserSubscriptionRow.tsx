import React from 'react';
import { Plus, XCircle, Ban, CheckCircle, FileText } from 'lucide-react';

export interface ProfileRowData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  upi_id?: string;
  professional_title?: string;
  subscription_status?: string;
  subscription_plan?: string;
  current_period_end?: string;
  created_at: string;
  invoicesCount?: number;
  totalBilled?: number;
  clientsCount?: number;
  workItemsCount?: number;
}

interface UserSubscriptionRowProps {
  key?: React.Key;
  profile: ProfileRowData;
  isBlocked: boolean;
  isProcessing: boolean;
  onGrantDays: (userId: string, name: string, grantLifetime?: boolean) => void;
  onRevoke: (userId: string, name: string) => void;
  onToggleBlock: (userId: string, currentlyBlocked: boolean) => void;
  onViewHistory: (profile: ProfileRowData) => void;
}

/**
 * Single user row in the Admin Freelancers & Subscriptions list.
 * Adheres strictly to GEMINI.md: text status with 6px dot, no colored pills, 120ms transitions.
 */
export default function UserSubscriptionRow({
  profile,
  isBlocked,
  isProcessing,
  onGrantDays,
  onRevoke,
  onToggleBlock,
  onViewHistory,
}: UserSubscriptionRowProps) {
  const now = Date.now();
  const expiryDate = profile.current_period_end ? new Date(profile.current_period_end) : null;
  const isLifetime = profile.subscription_plan === 'lifetime' && profile.subscription_status === 'active';
  const isEntitledStatus = ['active', 'trialing', 'grace'].includes(profile.subscription_status || '');
  const isSubActive = isLifetime || (isEntitledStatus && (!expiryDate || expiryDate.getTime() > now));

  return (
    <tr className="hover:bg-[#131318]/50 dark:hover:bg-[#1B1B22] transition-colors duration-120">
      <td className="p-4">
        <div className="font-bold text-[#F7F7F8] dark:text-[#F7F7F8] text-sm">
          {profile.name || 'Anonymous User'}
        </div>
        {profile.email && (
          <div className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5">
            {profile.email}
          </div>
        )}
        <div
          className="font-mono text-xs text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5 select-all"
          title="User UID"
        >
          {profile.id}
        </div>
        {profile.professional_title && (
          <div className="text-[#A1A1AA] dark:text-[#A1A1AA] text-xs mt-0.5">
            {profile.professional_title}
          </div>
        )}
      </td>
      <td className="p-4">
        {profile.phone && <div className="text-[#A1A1AA] dark:text-[#A1A1AA] text-sm font-medium">{profile.phone}</div>}
        {profile.upi_id && <div className="font-mono text-xs text-[#A1A1AA] mt-0.5">{profile.upi_id}</div>}
      </td>
      <td className="p-4">
        <div className="text-xs font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">
          {profile.invoicesCount || 0} Invoices
        </div>
        <div className="text-[11px] text-[#A1A1AA] mt-0.5">
          ₹{(profile.totalBilled || 0).toLocaleString()} billed · {profile.clientsCount || 0} clients
        </div>
      </td>
      <td className="p-4">
        {isBlocked ? (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F0607A]">
            <span className="w-2 h-2 rounded-full bg-[#E0002B]" />
            <span>Blocked</span>
          </div>
        ) : isLifetime ? (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FFC145]">
            <span className="w-2 h-2 rounded-full bg-[#FFC145]" />
            <span>Lifetime Pro</span>
          </div>
        ) : isSubActive ? (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2DD4A0]">
            <span className="w-2 h-2 rounded-full bg-[#2DD4A0]" />
            <span>{profile.subscription_status === 'trialing' ? 'Trial' : profile.subscription_status === 'grace' ? 'Grace' : 'Active Pro'}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A1A1AA]">
            <span className="w-2 h-2 rounded-full admin-indicator-inactive" />
            <span>No Active Plan</span>
          </div>
        )}
      </td>
      <td className="p-4 text-[#A1A1AA] dark:text-[#A1A1AA] text-xs font-medium">
        {expiryDate ? expiryDate.toLocaleDateString() : '—'}
      </td>
      <td className="p-4 text-right">
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => onViewHistory(profile)}
            className="bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] dark:hover:bg-[#1B1B22] text-[#A1A1AA] dark:text-[#A1A1AA] font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-120 inline-flex items-center gap-1 border-0 cursor-pointer"
            title="Inspect full user activity & history"
          >
            <FileText className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>History</span>
          </button>

          <button
            onClick={() => onGrantDays(profile.id, profile.name, false)}
            disabled={isProcessing}
            className="bg-surface-500 hover:bg-surface-400 text-text-primary border border-surface-400 font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
            title="Add 30 days to user's entitlement"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+30d</span>
          </button>

          {!isLifetime && (
            <button
              onClick={() => onGrantDays(profile.id, profile.name, true)}
              disabled={isProcessing}
              className="bg-[#1B1B22] hover:bg-[#2A2A33] text-[#FFC145] border border-[#2A2A33] font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
              title="Grant Lifetime Pro access"
            >
              <span>Lifetime</span>
            </button>
          )}

          {isSubActive && (
            <button
              onClick={() => onRevoke(profile.id, profile.name)}
              disabled={isProcessing}
              className="bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] dark:hover:bg-[#1B1B22] text-[#A1A1AA] dark:text-[#A1A1AA] font-semibold text-xs px-2.5 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1 border-0 cursor-pointer"
              title="Revoke subscription access"
            >
              <XCircle className="w-3.5 h-3.5 text-[#F0607A]" />
              <span>Revoke</span>
            </button>
          )}

          <button
            onClick={() => onToggleBlock(profile.id, isBlocked)}
            disabled={isProcessing}
            className={`font-semibold text-xs px-2 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1 border-0 cursor-pointer ${
              isBlocked
                ? 'bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] text-[#A1A1AA] dark:text-[#F7F7F8]'
                : 'text-[#A1A1AA] hover:text-[#E0002B] dark:hover:text-[#F0607A] hover:bg-[#131318] dark:hover:bg-[#1B1B22]'
            }`}
            title={isBlocked ? 'Unblock user' : 'Block user'}
          >
            {isBlocked ? <CheckCircle className="w-3.5 h-3.5 text-[#FF2D4A]" /> : <Ban className="w-3.5 h-3.5" />}
            <span>{isBlocked ? 'Unblock' : 'Block'}</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
