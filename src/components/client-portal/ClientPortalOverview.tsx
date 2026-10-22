/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  ArrowRight, 
  Play, 
  ExternalLink 
} from 'lucide-react';
import { Client, Invoice, WorkItem, UserProfile } from '../../types';
import StatusBadge from '../StatusBadge';

interface ClientPortalOverviewProps {
  currentClient: Client | null;
  userEmail: string | null;
  freelancerProfile: UserProfile | null;
  paymentStatus: {
    isNotificationRequired: boolean;
    notificationMessage?: string;
    label: string;
    daysRemaining: number;
  } | null;
  totalQuantityDelivered: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalPendingBalance: number;
  invoicesCount: number;
  recentWorkItems: WorkItem[];
  onNavigateToWork: () => void;
  onOpenVideoEmbed: (url: string, title: string) => void;
}

/**
 * Overview tab of Client Portal.
 * Adapts stats, greeting, and recent work snapshot smoothly across mobile and desktop.
 */
export const ClientPortalOverview: React.FC<ClientPortalOverviewProps> = ({
  currentClient,
  userEmail,
  freelancerProfile,
  paymentStatus,
  totalQuantityDelivered,
  totalInvoicedAmount,
  totalPaidAmount,
  totalPendingBalance,
  invoicesCount,
  recentWorkItems,
  onNavigateToWork,
  onOpenVideoEmbed,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Client & Freelancer Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {currentClient?.name || 'Client Workspace'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail}</span>
          </p>
        </div>

        {freelancerProfile && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg">
            <div className="w-9 h-9 bg-indigo-600 text-white font-bold rounded-lg flex items-center justify-center text-sm shrink-0">
              {freelancerProfile.name.charAt(0)}
            </div>
            <div className="text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">{freelancerProfile.name}</div>
              <div className="text-indigo-600 dark:text-indigo-400 font-medium">{freelancerProfile.professionalTitle}</div>
              {freelancerProfile.phone && (
                <div className="text-slate-400 dark:text-slate-500 text-[11px]">{freelancerProfile.phone}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Cycle Alert Banner */}
      {paymentStatus && (
        <div className="p-4 sm:p-5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3">
            {paymentStatus.isNotificationRequired ? (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-xs sm:text-sm">
                {paymentStatus.isNotificationRequired
                  ? `Payment Cycle Alert: ${paymentStatus.notificationMessage || paymentStatus.label}`
                  : `Payment Cycle: Up to Date`}
              </div>
              <div className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                Standard payment cycle is 30 days. Last recorded payment:{' '}
                {currentClient?.lastPaymentDate ? new Date(currentClient.lastPaymentDate).toLocaleDateString() : 'None recorded'}
              </div>
            </div>
          </div>

          <div className="text-xs font-medium px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0 self-start sm:self-center">
            {paymentStatus.daysRemaining >= 0
              ? `${paymentStatus.daysRemaining} days remaining in cycle`
              : `Delayed by ${Math.abs(paymentStatus.daysRemaining)} days`}
          </div>
        </div>
      )}

      {/* Financial & Work Metrics Grid: 1 col on mobile, 2 col on tablet, 4 col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Work Delivered
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalQuantityDelivered} Units
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Total videos / reels produced</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Invoiced
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            ₹{totalInvoicedAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Across {invoicesCount} invoice(s)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Paid
          </span>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            ₹{totalPaidAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Completed client payments</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Pending Balance
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            ₹{totalPendingBalance.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Due for pending invoices</p>
        </div>
      </div>

      {/* Recent Work Delivered Snapshot */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
            Recent Work Delivered
          </h3>
          <button
            type="button"
            onClick={onNavigateToWork}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer min-h-[44px] py-2"
          >
            <span>View Full Log</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {recentWorkItems.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No work items logged yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentWorkItems.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.description}
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-[11px]">
                    {new Date(item.date).toLocaleDateString()} • Qty: {item.quantity} • ₹{item.rate}/unit
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <StatusBadge status={item.status === 'Invoiced' ? 'Invoiced' : 'Pending'} />

                  {item.videoUrl && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenVideoEmbed(item.videoUrl!, item.description)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 min-h-[44px] px-2 py-1 cursor-pointer"
                        title="Watch Preview"
                      >
                        <Play size={13} />
                        <span>Watch Preview</span>
                      </button>
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                        title="Open external link"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
