import React from 'react';
import { Plus, XCircle, Ban, CheckCircle } from 'lucide-react';

export interface ProfileRowData {
  id: string;
  name: string;
  phone?: string;
  upi_id?: string;
  professional_title?: string;
  subscription_status?: string;
  subscription_plan?: string;
  current_period_end?: string;
  created_at: string;
}

interface UserSubscriptionRowProps {
  key?: React.Key;
  profile: ProfileRowData;
  isBlocked: boolean;
  isProcessing: boolean;
  onGrantDays: (userId: string, name: string) => void;
  onRevoke: (userId: string, name: string) => void;
  onToggleBlock: (userId: string, currentlyBlocked: boolean) => void;
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
  onToggleBlock
}: UserSubscriptionRowProps) {
  const now = Date.now();
  const expiryDate = profile.current_period_end ? new Date(profile.current_period_end) : null;
  const isSubActive = profile.subscription_status === 'active' && expiryDate && expiryDate.getTime() > now;

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-120">
      <td className="p-4">
        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
          {profile.name || 'Anonymous User'}
        </div>
        <div
          className="font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5 select-all"
          title="User UID"
        >
          {profile.id}
        </div>
        {profile.professional_title && (
          <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {profile.professional_title}
          </div>
        )}
      </td>
      <td className="p-4">
        {profile.phone && <div className="text-slate-700 dark:text-slate-300 text-sm font-medium">{profile.phone}</div>}
        {profile.upi_id && <div className="font-mono text-xs text-slate-500 mt-0.5">{profile.upi_id}</div>}
      </td>
      <td className="p-4">
        {isBlocked ? (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
            <span>Blocked</span>
          </div>
        ) : isSubActive ? (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <span>Active Pro</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>No Active Plan</span>
          </div>
        )}
      </td>
      <td className="p-4 text-slate-600 dark:text-slate-300 text-xs font-medium">
        {expiryDate ? expiryDate.toLocaleDateString() : '—'}
      </td>
      <td className="p-4 text-right">
        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => onGrantDays(profile.id, profile.name)}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1.5 border-0 cursor-pointer"
            title="Add 30 days to user's subscription"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+30 Days</span>
          </button>

          {isSubActive && (
            <button
              onClick={() => onRevoke(profile.id, profile.name)}
              disabled={isProcessing}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1.5 border-0 cursor-pointer"
              title="Revoke subscription access"
            >
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Revoke</span>
            </button>
          )}

          <button
            onClick={() => onToggleBlock(profile.id, isBlocked)}
            disabled={isProcessing}
            className={`font-semibold text-xs sm:text-sm px-2.5 py-1.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1.5 border-0 cursor-pointer ${
              isBlocked
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                : 'text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isBlocked ? 'Unblock user' : 'Block user'}
          >
            {isBlocked ? <CheckCircle className="w-3.5 h-3.5 text-indigo-500" /> : <Ban className="w-3.5 h-3.5" />}
            <span>{isBlocked ? 'Unblock' : 'Block'}</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
