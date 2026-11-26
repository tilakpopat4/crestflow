import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserPlus, Trash2, RefreshCw } from 'lucide-react';

interface WhitelistRow {
  id: string;
  email: string;
  reason?: string;
  created_at: string;
}

/**
 * VIP Whitelist Manager.
 * Grants free VIP subscription bypass to specified email addresses via Cloud Firestore.
 * Adheres strictly to GEMINI.md: flat, restrained SaaS aesthetic with 120ms transitions.
 */
export default function AdminWhitelistManager() {
  const [whitelist, setWhitelist] = useState<WhitelistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'subscription_whitelist'),
      (snapshot) => {
        const items: WhitelistRow[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            email: data.email || d.id,
            reason: data.reason || '',
            created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()
          });
        });
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setWhitelist(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading whitelist:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'subscription_whitelist', cleanEmail), {
        email: cleanEmail,
        reason: newReason.trim() || 'Approved by Admin',
        createdAt: Date.now()
      });
      setNewEmail('');
      setNewReason('');
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
      await deleteDoc(doc(db, 'subscription_whitelist', id));
    } catch (err: any) {
      alert(`Error removing email: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-[#131318] dark:bg-[#131318] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl overflow-hidden shadow-2xs space-y-4">
      {/* Header and Add Form */}
      <div className="p-5 border-b border-[#2A2A33] dark:border-[#2A2A33]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8]">
              VIP Email Whitelist
            </h2>
            <p className="text-sm text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5">
              Whitelisted emails bypass subscriptions and receive full lifetime VIP access.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 300);
            }}
            className="p-2 text-[#A1A1AA] hover:text-[#F7F7F8] dark:text-[#A1A1AA] dark:hover:text-[#F7F7F8] rounded-lg hover:bg-[#131318] dark:hover:bg-[#1B1B22] transition-colors duration-120 self-start sm:self-auto border-0 cursor-pointer"
            title="Refresh whitelist"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add Email Form */}
        <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="freelancer@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="flex-1 bg-[#131318] dark:bg-[#0B0B0E] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg px-3.5 py-2.5 text-sm text-[#F7F7F8] dark:text-[#F7F7F8] placeholder:text-[#A1A1AA] outline-none focus:border-[#FF2D4A] transition-colors duration-120"
          />
          <input
            type="text"
            placeholder="Reason (e.g. VIP Partner / Beta tester)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            className="sm:w-72 bg-[#131318] dark:bg-[#0B0B0E] border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg px-3.5 py-2.5 text-sm text-[#F7F7F8] dark:text-[#F7F7F8] placeholder:text-[#A1A1AA] outline-none focus:border-surface-400 transition-colors duration-120"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent-hover text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors duration-120 disabled:opacity-50 inline-flex items-center justify-center gap-2 border-0 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Whitelist</span>
          </button>
        </form>
      </div>

      {/* Whitelist Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-[#A1A1AA] text-sm">
            Loading whitelist...
          </div>
        ) : whitelist.length === 0 ? (
          <div className="p-12 text-center text-[#A1A1AA] text-sm">
            No whitelisted emails yet. Add an email above to grant full free VIP access.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#131318] dark:bg-[#0B0B0E] text-[#A1A1AA] dark:text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold border-b border-[#2A2A33] dark:border-[#2A2A33]">
                <th className="p-4">Email Address</th>
                <th className="p-4">Approval Reason</th>
                <th className="p-4">Granted On</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A33] dark:divide-[#2A2A33]/60">
              {whitelist.map((row) => {
                const isProcessing = actionLoading === row.id;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-[#131318]/50 dark:hover:bg-[#1B1B22] transition-colors duration-120"
                  >
                    <td className="p-4">
                      <span className="font-semibold text-[#F7F7F8] dark:text-[#F7F7F8] text-sm">
                        {row.email}
                      </span>
                    </td>
                    <td className="p-4 text-[#A1A1AA] dark:text-[#A1A1AA] text-sm">
                      {row.reason || 'Approved by Admin'}
                    </td>
                    <td className="p-4 text-[#A1A1AA] dark:text-[#A1A1AA] text-xs">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRemove(row.id, row.email)}
                        disabled={isProcessing}
                        className="text-[#A1A1AA] hover:text-[#E0002B] dark:hover:text-[#F0607A] px-2.5 py-1.5 rounded-lg hover:bg-[#131318] dark:hover:bg-[#1B1B22] transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1.5 border-0 cursor-pointer font-medium text-xs sm:text-sm"
                        title="Remove VIP access"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
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
