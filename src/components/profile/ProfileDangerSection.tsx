import React, { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { Trash2, X, Loader2 } from 'lucide-react';
import { auth } from '../../firebase';

interface ProfileDangerSectionProps {
  user: User;
}

/**
 * Account deletion section inside Account Settings.
 * Requires explicit modal confirmation (typing "DELETE") before calling POST /api/delete-account
 * to permanently remove all workspace records and the Firebase Auth user account.
 */
export const ProfileDangerSection: React.FC<ProfileDangerSectionProps> = ({ user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmInput.trim() === 'DELETE';

  const handleOpenModal = () => {
    setConfirmInput('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isDeleting) return;
    setIsModalOpen(false);
    setConfirmInput('');
    setError(null);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = user?.uid;
    if (!isConfirmed || isDeleting || !uid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as any)?.success) {
        throw new Error((data as any)?.error || 'Failed to delete account. Please try again.');
      }

      // Clear local user caches before signing out
      try {
        localStorage.removeItem(`crestflow_sub_${uid}`);
        localStorage.removeItem(`crestflow_onboarded_${uid}`);
        localStorage.removeItem('crestflow_is_blocked');
      } catch {}

      await signOut(auth).catch(() => {});
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || 'Unable to complete account deletion right now.');
      setIsDeleting(false);
    }
  };

  return (
    <section
      id="section-danger"
      className="grid grid-cols-1 gap-x-8 gap-y-4 pt-8 lg:grid-cols-[13rem_minmax(0,1fr)]"
    >
      <div>
        <h2 className="text-base font-semibold text-[#E0002B] dark:text-[#F0607A]">
          Delete account
        </h2>
        <p className="mt-1 text-xs text-[#A1A1AA] dark:text-[#A1A1AA] leading-relaxed">
          Permanently delete your account.
        </p>
      </div>

      <div className="rounded-xl bg-[#131318] dark:bg-[#131318] overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <p className="text-sm font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">
              Permanently delete your account
            </p>
            <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] leading-relaxed">
              Erases all workspace data and cancels any active subscription.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="h-9 px-4 rounded-lg text-xs font-medium bg-[#E0002B] hover:bg-[#E0002B] text-white border-0 cursor-pointer transition-colors duration-120 inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Explicit Confirmation Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-surface-700 border border-surface-400 text-text-primary p-6 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="delete-account-modal-title"
                  className="text-base font-bold text-[#F7F7F8] dark:text-white"
                >
                  Confirm Account Deletion
                </h3>
                <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] mt-1">
                  Signed in as <span className="font-medium text-[#A1A1AA] dark:text-[#F7F7F8]">{user.email}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isDeleting}
                aria-label="Close confirmation dialog"
                className="p-1.5 text-[#A1A1AA] hover:text-[#A1A1AA] dark:hover:text-[#F7F7F8] rounded-lg hover:bg-[#131318] dark:hover:bg-[#1B1B22] border-0 cursor-pointer transition-colors duration-120 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#131318] dark:bg-[#131318] border border-[#2A2A33] dark:border-[#2A2A33] space-y-1.5 text-xs text-[#A1A1AA] dark:text-[#A1A1AA] leading-relaxed">
              <p className="font-semibold text-[#E0002B] dark:text-[#F0607A]">
                This action is permanent and cannot be undone.
              </p>
              <p>
                All of your clients, deliverables, invoices, notes, reviews, public portfolio, and account credentials will be permanently removed.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[#1B1B22] dark:bg-red-950/40 border border-[#E0002B] dark:border-red-900 text-xs text-[#E0002B] dark:text-[#F0607A]">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div>
                <label
                  htmlFor="delete-confirm-input"
                  className="block text-xs font-medium text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5"
                >
                  Type <span className="font-bold text-[#F7F7F8] dark:text-white">DELETE</span> to confirm
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  autoComplete="off"
                  autoFocus
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  disabled={isDeleting}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#131318] dark:bg-[#0B0B0E] text-[#F7F7F8] dark:text-white placeholder:text-[#A1A1AA] dark:placeholder:text-[#A1A1AA] border-none outline-none focus:outline-none focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] dark:hover:bg-[#2A2A33] text-[#A1A1AA] dark:text-[#F7F7F8] border-0 cursor-pointer transition-colors duration-120 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isConfirmed || isDeleting}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#E0002B] hover:bg-[#E0002B] text-white border-0 cursor-pointer transition-colors duration-120 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting account...</span>
                    </>
                  ) : (
                    <span>Permanently Delete Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProfileDangerSection;
