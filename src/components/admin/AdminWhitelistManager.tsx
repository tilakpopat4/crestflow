import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { addToWhitelist, removeFromWhitelist } from '../../lib/youpiService';
import { UserPlus, Trash2, RefreshCw } from 'lucide-react';

interface WhitelistRow {
  id: string;
  email: string;
  reason?: string;
  created_at: string;
}

/**
 * VIP Whitelist Manager.
 * Grants free VIP subscription bypass to specified email addresses.
 * Adheres strictly to GEMINI.md: flat, restrained SaaS aesthetic with 120ms transitions.
 */
export default function AdminWhitelistManager() {
  const [whitelist, setWhitelist] = useState<WhitelistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWhitelist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWhitelist(data || []);
    } catch (err) {
      console.error('Failed to load whitelist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelist();

    const channel = supabase
      .channel('admin_whitelist_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_whitelist' },
        () => {
          fetchWhitelist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await addToWhitelist(newEmail.trim(), newReason.trim() || 'Approved by Admin');
      setNewEmail('');
      setNewReason('');
      await fetchWhitelist();
    } catch (err: any) {
      alert(`Error adding email: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string, email: string) => {
    if (!window.confirm(`Revoke VIP free access for ${email}?`)) return;

    setActionLoading(id);
    try {
      await removeFromWhitelist(id);
      await fetchWhitelist();
    } catch (err: any) {
      alert(`Error removing email: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden space-y-4">
      {/* Header and Add Form */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              VIP Email Whitelist
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Whitelisted emails bypass the ₹49 subscription and receive full lifetime VIP access without entering payments.
            </p>
          </div>
          <button
            onClick={fetchWhitelist}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 self-start sm:self-auto border-0 cursor-pointer"
            title="Refresh whitelist"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add Email Form */}
        <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="freelancer@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
          <input
            type="text"
            placeholder="Reason (e.g. VIP Partner / Beta tester)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="sm:w-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors duration-120"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 border-0 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Whitelist</span>
          </button>
        </form>
      </div>

      {/* Whitelist Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Loading whitelist...
          </div>
        ) : whitelist.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No whitelisted emails yet. Add an email above to grant full free VIP access.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 font-semibold">Email Address</th>
                <th className="p-3 font-semibold">Approval Reason</th>
                <th className="p-3 font-semibold">Granted On</th>
                <th className="p-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {whitelist.map((row) => {
                const isProcessing = actionLoading === row.id;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-120"
                  >
                    <td className="p-3">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {row.email}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {row.reason || 'Approved by Admin'}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRemove(row.id, row.email)}
                        disabled={isProcessing}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1 border-0 cursor-pointer"
                        title="Remove VIP access"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs">Remove</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
