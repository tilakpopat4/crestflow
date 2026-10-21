import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ShieldPlus, Trash2, Shield, Lock } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../../lib/adminConfig';

export interface AdminUserRecord {
  email: string;
  name?: string;
  role?: 'superadmin' | 'admin';
  addedBy?: string;
  addedAt?: number;
}

interface AdminUsersManagerProps {
  currentUserEmail?: string | null;
}

/**
 * AdminUsersManager manages administrator Google accounts in Cloud Firestore.
 * Allows the superadmin to view authorized admins and manually grant or revoke admin access.
 * Strictly adheres to GEMINI.md design standards: flat, restrained SaaS aesthetic.
 */
export default function AdminUsersManager({ currentUserEmail }: AdminUsersManagerProps) {
  const [adminList, setAdminList] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'admin_users'),
      (snapshot) => {
        const items: AdminUserRecord[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const email = (data.email || d.id || '').toLowerCase().trim();
          if (email && email !== SUPER_ADMIN_EMAIL) {
            items.push({
              email,
              name: data.name || '',
              role: 'admin',
              addedBy: data.addedBy || 'tilakpopat2007@gmail.com',
              addedAt: data.addedAt || Date.now(),
            });
          }
        });
        items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        setAdminList(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching admin_users collection:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Please enter a valid Google email address.');
      return;
    }

    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      alert(`${SUPER_ADMIN_EMAIL} is already the permanent Super Admin.`);
      setNewEmail('');
      setNewName('');
      return;
    }

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'admin_users', cleanEmail), {
        email: cleanEmail,
        name: newName.trim() || 'Admin User',
        role: 'admin',
        addedBy: currentUserEmail || SUPER_ADMIN_EMAIL,
        addedAt: Date.now(),
      });
      setNewEmail('');
      setNewName('');
    } catch (err: any) {
      alert(`Error adding admin: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAdmin = async (email: string) => {
    if (email === SUPER_ADMIN_EMAIL) {
      alert('The Super Admin account cannot be removed.');
      return;
    }

    if (!window.confirm(`Revoke administrator privileges for ${email}?`)) {
      return;
    }

    setActionLoading(email);
    try {
      await deleteDoc(doc(db, 'admin_users', email));
    } catch (err: any) {
      alert(`Error revoking admin: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs space-y-4">
      {/* Top Header and Add Form */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Authorized Admin Google Accounts</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Only Google IDs listed here can access and administer the CrestFlow Command Center.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Admin Google Email
            </label>
            <input
              type="email"
              placeholder="e.g. administrator@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors duration-120"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Name or Department
            </label>
            <input
              type="text"
              placeholder="e.g. Operations / Co-founder"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors duration-120"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || !newEmail.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-120 flex items-center justify-center gap-1.5 cursor-pointer border-0"
            >
              <ShieldPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Adding...' : 'Add Admin'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Admin Accounts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-5">Administrator Account</th>
              <th className="py-3 px-5">Role</th>
              <th className="py-3 px-5">Description</th>
              <th className="py-3 px-5">Added Date</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* Super Admin Permanent Row */}
            <tr className="bg-indigo-50/30 dark:bg-indigo-950/10">
              <td className="py-3.5 px-5">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {SUPER_ADMIN_EMAIL}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Platform Owner
                </div>
              </td>
              <td className="py-3.5 px-5">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  Super Admin
                </span>
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                Primary Root Administrator
              </td>
              <td className="py-3.5 px-5 text-slate-500 text-xs">
                Permanent
              </td>
              <td className="py-3.5 px-5 text-right">
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Protected</span>
                </span>
              </td>
            </tr>

            {/* Manually Added Admins */}
            {adminList.map((admin) => (
              <tr key={admin.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-120">
                <td className="py-3.5 px-5">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {admin.email}
                  </div>
                  {admin.addedBy && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Added by: {admin.addedBy}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Admin
                  </span>
                </td>
                <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                  {admin.name || '—'}
                </td>
                <td className="py-3.5 px-5 text-slate-500 text-xs">
                  {admin.addedAt ? new Date(admin.addedAt).toLocaleDateString() : '—'}
                </td>
                <td className="py-3.5 px-5 text-right">
                  <button
                    onClick={() => handleRevokeAdmin(admin.email)}
                    disabled={actionLoading === admin.email}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors duration-120 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                    title={`Revoke admin privileges for ${admin.email}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {adminList.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  No additional administrators added. Only {SUPER_ADMIN_EMAIL} has access.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
