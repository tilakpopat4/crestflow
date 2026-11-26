import { useState } from 'react';
import { User } from 'firebase/auth';
import { Invoice } from '../types';
import { useAccess } from './useAccess';
import { useToast } from '../context/ToastContext';

/**
 * Manages token-scoped public invoice link creation & revocation.
 */
export function useInvoiceShareActions(user: User | null) {
  const access = useAccess();
  const { showToast } = useToast();
  const [sharedLinks, setSharedLinks] = useState<Record<string, string>>({});
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);

  const handleCreateShareLink = async (inv: Invoice) => {
    if (!access.requireAccess('share_invoice', 'Create a private token-protected payment link for your client.')) {
      return;
    }
    if (!user) return;
    setShareLoadingId(inv.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/invoices/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId: inv.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { shareUrl?: string; error?: string };
      if (!res.ok || !data.shareUrl) {
        showToast(data.error || 'Could not create public invoice link.', 'error');
        return;
      }
      setSharedLinks((prev) => ({ ...prev, [inv.id]: data.shareUrl! }));
      try {
        await navigator.clipboard.writeText(data.shareUrl);
        showToast('Token-scoped client invoice link copied to clipboard.', 'success');
      } catch {
        showToast('Public invoice link ready.', 'success');
      }
    } catch {
      showToast('Network error generating share link.', 'error');
    } finally {
      setShareLoadingId(null);
    }
  };

  const handleRevokeShareLink = async (inv: Invoice) => {
    if (!user) return;
    setShareLoadingId(inv.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/invoices/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId: inv.id }),
      });
      if (!res.ok) {
        showToast('Could not revoke invoice link.', 'error');
        return;
      }
      setSharedLinks((prev) => {
        const next = { ...prev };
        delete next[inv.id];
        return next;
      });
      showToast('Invoice payment link revoked.', 'info');
    } finally {
      setShareLoadingId(null);
    }
  };

  return {
    sharedLinks,
    shareLoadingId,
    handleCreateShareLink,
    handleRevokeShareLink,
  };
}
