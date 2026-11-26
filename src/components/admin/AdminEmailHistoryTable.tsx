import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Search, RefreshCw, Trash2 } from 'lucide-react';
import { auth } from '../../firebase';
import AdminEmailDetailModal from './AdminEmailDetailModal';
import AdminEmailHistoryRow from './AdminEmailHistoryRow';

export interface EmailRecord {
  jobId: string;
  eventType: string;
  recipient: string;
  subject?: string;
  status: 'sent' | 'failed' | 'queued' | 'scheduled' | 'retry_pending' | 'processing' | 'cancelled';
  createdAt?: number;
  sentAt?: number;
  updatedAt?: number;
  providerMessageId?: string;
  lastErrorCode?: string;
  templateData?: Record<string, any>;
  idempotencyKey?: string;
}

/**
 * AdminEmailHistoryTable renders the complete chronological history of all
 * transactional, lifecycle, and administrative emails dispatched or queued.
 * Adheres strictly to GEMINI.md design standards: flat, restrained SaaS aesthetic, no emojis.
 */
export default function AdminEmailHistoryTable({ refreshSignal }: { refreshSignal?: number } = {}) {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'queued'>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all email history records?')) return;
    setIsClearing(true);
    setActionFeedback(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');
      const res = await fetch('/api/admin/clear-email-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to clear history');
      setActionFeedback(data.message || 'History cleared');
      await fetchEmailHistory();
    } catch (err: any) {
      setActionFeedback(`Clear error: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const fetchEmailHistory = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/email-history?limit=100', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load email history (${res.status})`);
      }

      const data = (await res.json().catch(() => ({}))) as { emails?: EmailRecord[] };
      setEmails(data.emails || []);
    } catch (err: any) {
      setActionFeedback(err.message || 'Failed to fetch email history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailHistory();
  }, [refreshSignal]);

  const handleRetry = async (jobId: string) => {
    setRetryingJobId(jobId);
    setActionFeedback(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      const res = await fetch('/api/admin/email-retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Retry attempt failed');
      }

      setActionFeedback(`Dispatched retry successfully (ID: ${data.id || jobId})`);
      await fetchEmailHistory();
    } catch (err: any) {
      setActionFeedback(`Retry failed: ${err.message}`);
    } finally {
      setRetryingJobId(null);
    }
  };

  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || item.recipient.toLowerCase().includes(q) || (item.subject && item.subject.toLowerCase().includes(q)) || item.jobId.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'sent') return item.status === 'sent';
      if (statusFilter === 'failed') return item.status === 'failed' || item.status === 'retry_pending';
      if (statusFilter === 'queued') return item.status === 'queued' || item.status === 'scheduled';
      return true;
    });
  }, [emails, search, statusFilter]);

  const stats = useMemo(() => {
    const total = emails.length;
    const sent = emails.filter((e) => e.status === 'sent').length;
    const failed = emails.filter((e) => e.status === 'failed' || e.status === 'retry_pending').length;
    const queued = emails.filter((e) => e.status === 'queued' || e.status === 'scheduled').length;
    return { total, sent, failed, queued };
  }, [emails]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-[#131318] dark:bg-[#131318] rounded-xl overflow-hidden shadow-2xs space-y-4">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-[#2A2A33] dark:border-[#2A2A33] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#A1A1AA] dark:text-[#A1A1AA]" />
            <h3 className="font-semibold text-sm text-[#F7F7F8] dark:text-[#F7F7F8]">
              Live Mail Dispatch History
            </h3>
          </div>
          <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5">
            Real-time delivery log of transactional notifications and automated triggers
          </p>
        </div>

        {/* Search, Filter & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-[#131318] dark:bg-[#1B1B22] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg text-[#F7F7F8] dark:text-[#F7F7F8] outline-none focus:border-indigo-600 w-48 sm:w-60"
            />
          </div>

          <div className="flex items-center bg-[#0B0B0E] p-1 rounded-lg text-xs font-medium border border-[#2A2A33]">
            {(['all', 'sent', 'failed', 'queued'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md capitalize font-medium cursor-pointer transition-colors duration-120 border-0 text-xs ${
                  statusFilter === s
                    ? 'bg-[#1B1B22] text-white font-semibold shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchEmailHistory}
            disabled={loading}
            className="p-1.5 bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] dark:hover:bg-[#1B1B22] text-[#A1A1AA] dark:text-[#A1A1AA] rounded-lg cursor-pointer transition-colors disabled:opacity-50"
            title="Refresh mail log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {emails.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={isClearing}
              className="px-2.5 py-1.5 bg-[#1B1B22] hover:bg-[#1B1B22] dark:bg-red-950/40 dark:hover:bg-red-900/50 text-[#E0002B] dark:text-[#F0607A] text-xs font-medium rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 border border-[#E0002B] dark:border-red-900/60"
              title="Clear all previous records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isClearing ? 'Clearing...' : 'Clear History'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 sm:px-5">
        <div className="p-3 bg-[#131318] dark:bg-[#1B1B22] rounded-lg">
          <span className="text-[11px] font-medium text-[#A1A1AA] dark:text-[#A1A1AA] uppercase tracking-wider block">Total Dispatches</span>
          <span className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8]">{stats.total}</span>
        </div>
        <div className="p-3 bg-[#131318] dark:bg-[#1B1B22] rounded-lg">
          <span className="text-[11px] font-medium text-[#A1A1AA] dark:text-[#A1A1AA] uppercase tracking-wider block">Delivered</span>
          <span className="text-lg font-bold text-[#FF2D4A] dark:text-[#FF2D4A]">{stats.sent}</span>
        </div>
        <div className="p-3 bg-[#131318] dark:bg-[#1B1B22] rounded-lg">
          <span className="text-[11px] font-medium text-[#A1A1AA] dark:text-[#A1A1AA] uppercase tracking-wider block">Failed / Errors</span>
          <span className="text-lg font-bold text-[#E0002B] dark:text-[#F0607A]">{stats.failed}</span>
        </div>
        <div className="p-3 bg-[#131318] dark:bg-[#1B1B22] rounded-lg">
          <span className="text-[11px] font-medium text-[#A1A1AA] dark:text-[#A1A1AA] uppercase tracking-wider block">Queued / Active</span>
          <span className="text-lg font-bold text-[#A1A1AA] dark:text-[#A1A1AA]">{stats.queued}</span>
        </div>
      </div>

      {actionFeedback && (
        <div className="mx-4 sm:mx-5 p-3 rounded-lg text-xs bg-[#131318] dark:bg-[#1B1B22] border border-[#2A2A33] dark:border-[#2A2A33] text-[#F7F7F8] dark:text-[#F7F7F8]">
          {actionFeedback}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#131318] dark:bg-[#1B1B22] text-[#A1A1AA] dark:text-[#A1A1AA] border-b border-[#2A2A33] dark:border-[#2A2A33]">
            <tr>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Recipient</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Occasion / Subject</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Dispatched At</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Provider ID</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A33] dark:divide-[#2A2A33] text-[#A1A1AA] dark:text-[#A1A1AA]">
            {loading && emails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#A1A1AA] dark:text-[#A1A1AA]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#FF2D4A]" />
                  <span>Loading mail dispatch history...</span>
                </td>
              </tr>
            ) : filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#A1A1AA] dark:text-[#A1A1AA]">
                  No email history matches your filter.
                </td>
              </tr>
            ) : (
              filteredEmails.map((item) => (
                <AdminEmailHistoryRow
                  key={item.jobId}
                  item={item}
                  onInspect={(it) => setSelectedEmail(it)}
                  onRetry={handleRetry}
                  isRetrying={retryingJobId === item.jobId}
                  formatDate={formatDate}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Inspection Modal */}
      <AdminEmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        formatDate={formatDate}
      />
    </div>
  );
}
