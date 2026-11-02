import React, { useState } from 'react';
import { Search, RefreshCw, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { AdminUserUnified, PlatformHistoryStats } from '../../hooks/useAdminUsersAndHistory';

interface AdminPlatformHistoryProps {
  users: AdminUserUnified[];
  stats: PlatformHistoryStats;
  loading: boolean;
  onRefresh: () => void;
}

/**
 * AdminPlatformHistory: Global audit trail and activity feed for all historical
 * transactions, invoices, and metrics across every freelancer on CrestFlow.
 * Strictly adheres to GEMINI.md: text status with 6px dot, no colored pills, 120ms transitions.
 */
export default function AdminPlatformHistory({
  users,
  stats,
  loading,
  onRefresh,
}: AdminPlatformHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'invoiced' | 'draft' | 'overdue'>('all');

  // Flatten all invoices across all users into a global list
  const allInvoices = users.flatMap((u) =>
    (u.invoices || []).map((inv) => ({
      ...inv,
      freelancerName: u.name,
      freelancerEmail: u.email,
      freelancerUid: u.id,
    }))
  );

  // Sort by invoice creation date descending
  allInvoices.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const filteredInvoices = allInvoices.filter((inv) => {
    if (statusFilter !== 'all' && (inv.status || 'draft').toLowerCase() !== statusFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
      (inv.clientName && inv.clientName.toLowerCase().includes(q)) ||
      (inv.clientEmail && inv.clientEmail.toLowerCase().includes(q)) ||
      (inv.freelancerName && inv.freelancerName.toLowerCase().includes(q)) ||
      (inv.freelancerEmail && inv.freelancerEmail.toLowerCase().includes(q)) ||
      (inv.freelancerUid && inv.freelancerUid.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Aggregation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Invoices Created
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalInvoices}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Billed Volume
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            ₹{stats.totalBilledVolume.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Clients Added
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalClients}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1 shadow-2xs border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Work Items Logged
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {stats.totalWorkItems}
          </div>
        </div>
      </div>

      {/* Invoices Audit Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Platform Activity & Invoices Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete historical record of all invoices generated across the application.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
              {(['all', 'paid', 'invoiced', 'overdue'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-colors duration-120 border-0 cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice, client, UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors duration-120"
              />
            </div>

            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border-0 cursor-pointer"
              title="Refresh activity feed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Loading platform history...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No invoices matching criteria.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Freelancer</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredInvoices.map((inv: any) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-120"
                  >
                    <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {inv.invoiceNumber || inv.id.slice(0, 8)}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {inv.freelancerName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{inv.freelancerEmail}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {inv.clientName || 'Unnamed Client'}
                      </div>
                      {inv.clientEmail && (
                        <div className="text-[11px] text-slate-400">{inv.clientEmail}</div>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {inv.currency || '₹'} {Number(inv.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          Paid
                        </span>
                      ) : inv.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-600" />
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          {inv.status || 'Draft'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-slate-500 font-medium">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
