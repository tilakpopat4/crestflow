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
        <div className="bg-[#212121] border border-[#333333] rounded-xl p-4 sm:p-5 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Invoices Created
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {stats.totalInvoices}
          </div>
        </div>

        <div className="bg-[#212121] border border-[#333333] rounded-xl p-4 sm:p-5 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Billed Volume
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            ₹{stats.totalBilledVolume.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#212121] border border-[#333333] rounded-xl p-4 sm:p-5 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Clients Added
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {stats.totalClients}
          </div>
        </div>

        <div className="bg-[#212121] border border-[#333333] rounded-xl p-4 sm:p-5 space-y-1 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Work Items Logged
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {stats.totalWorkItems}
          </div>
        </div>
      </div>

      {/* Invoices Audit Table */}
      <div className="bg-[#212121] border border-[#333333] rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#333333]">
          <div>
            <h2 className="text-lg font-bold text-white">
              Platform Activity & Invoices Log
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete historical record of all invoices generated across the application.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex bg-[#181818] p-1 rounded-lg text-xs font-medium border border-[#2a2a2a]">
              {(['all', 'paid', 'invoiced', 'overdue'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md capitalize transition-colors duration-120 border-0 cursor-pointer text-xs ${
                    statusFilter === st
                      ? 'bg-[#282828] text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
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
                className="w-full bg-[#181818] border border-[#333333] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors duration-120"
              />
            </div>

            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#282828] border-0 cursor-pointer"
              title="Refresh activity feed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading platform history...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No invoices matching criteria.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#181818] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#333333]">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Freelancer</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {filteredInvoices.map((inv: any) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#282828]/50 transition-colors duration-120"
                  >
                    <td className="p-4 font-mono font-bold text-slate-300">
                      {inv.invoiceNumber || inv.id.slice(0, 8)}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {inv.freelancerName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{inv.freelancerEmail}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {inv.clientName || 'Unnamed Client'}
                      </div>
                      {inv.clientEmail && (
                        <div className="text-[11px] text-slate-400">{inv.clientEmail}</div>
                      )}
                    </td>
                    <td className="p-4 font-bold text-white text-sm">
                      {inv.currency || '₹'} {Number(inv.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-indigo-400">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          Paid
                        </span>
                      ) : inv.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-500" />
                          {inv.status || 'Draft'}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-slate-400 font-medium">
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

