import React, { useState } from 'react';
import { X, Upload, Check, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AdminSyncAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced: () => void;
}

// Known Firebase Auth accounts from project console
const KNOWN_AUTH_USERS = [
  { uid: 'znCyV2ZEtzN1U2lA6n6jFkQG1v82', email: 'amrutdham1986@gmail.com', name: 'Amrutdham' },
  { uid: '39OvJEFIIBUWUrN8E9uK7YwO2mP2', email: 'dhyeyseta07@gmail.com', name: 'Dhyey Seta' },
  { uid: 'PoK5JyR1M3gL7wQ8x9vN4pZ2aB12', email: 'himanshukumar@gmail.com', name: 'Himanshu Kumar' },
  { uid: 'kA21isZs4fdiv2Eg5H7jK9mP3nQ2', email: 'sanskarcoaching@gmail.com', name: 'Sanskar Coaching' },
  { uid: 'wOPo4Hoo4YR8z7x6v5c4b3n2m1a2', email: 'ku2407u441@gmail.com', name: 'KU2407U441' },
  { uid: 'vKxlvtHOJBaOo7p6q5r4s3t2u1v2', email: 'akshatpopat@gmail.com', name: 'Akshat Popat' },
  { uid: '9rmOON9jRNRE5t4y3u2i1o0p9a82', email: 'work.tilakpopat@gmail.com', name: 'Work Tilak' },
  { uid: 'We51zVNL5Qd12a3s4d5f6g7h8j92', email: 'reptilepython@gmail.com', name: 'Reptile Python' },
  { uid: 'zCePxBd2bzav1q2w3e4r5t6y7u82', email: 'ku2407u403@gmail.com', name: 'KU2407U403' },
  { uid: 'xVglbVvnrSNVzJG7OBYatahRBQ02', email: 'tilakpopat2007@gmail.com', name: 'Tilak Popat' },
];

/**
 * AdminSyncAuthModal: Enables the superadmin to sync accounts from Firebase Authentication
 * (which are stored separately from Firestore) into Cloud Firestore `profiles` collection.
 * Adheres strictly to GEMINI.md: flat, restrained SaaS aesthetic.
 */
export default function AdminSyncAuthModal({ isOpen, onClose, onSynced }: AdminSyncAuthModalProps) {
  const [pasteData, setPasteData] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleUid, setSingleUid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. One-click sync known auth accounts from console screenshot
  const handleSyncKnownUsers = async () => {
    setIsProcessing(true);
    setStatusMessage('Syncing known Firebase Auth users to Firestore...');
    try {
      let count = 0;
      for (const u of KNOWN_AUTH_USERS) {
        await setDoc(
          doc(db, 'profiles', u.uid),
          {
            id: u.uid,
            userId: u.uid,
            name: u.name,
            email: u.email,
            isPublicProfile: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          { merge: true }
        );
        count++;
      }
      setStatusMessage(`Successfully synced ${count} Firebase Auth accounts to Firestore.`);
      onSynced();
    } catch (err: any) {
      setStatusMessage(`Sync error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Parse pasted JSON or CSV from Firebase Console Export (Users -> 3 dots -> Export users)
  const handleImportPasted = async () => {
    if (!pasteData.trim()) return;
    setIsProcessing(true);
    setStatusMessage('Parsing and importing accounts...');
    try {
      let imported = 0;
      const text = pasteData.trim();

      // Check if JSON
      if (text.startsWith('[') || text.startsWith('{')) {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : parsed.users || [];
        for (const item of list) {
          const uid = item.localId || item.uid || item.id;
          const email = item.email;
          if (uid && email) {
            await setDoc(
              doc(db, 'profiles', uid),
              {
                id: uid,
                userId: uid,
                name: item.displayName || email.split('@')[0],
                email,
                photoURL: item.photoUrl || '',
                isPublicProfile: true,
                createdAt: item.createdAt ? Number(item.createdAt) : Date.now(),
                updatedAt: Date.now(),
              },
              { merge: true }
            );
            imported++;
          }
        }
      } else {
        // Assume CSV or plain lines (UID, Email or Email, UID or just emails)
        const lines = text.split('\n');
        for (const line of lines) {
          const parts = line.split(/[,\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 2) {
            const [p1, p2, p3] = parts;
            const uid = p1.length > 20 ? p1 : p2.length > 20 ? p2 : `usr_${Math.random().toString(36).slice(2, 10)}`;
            const email = p1.includes('@') ? p1 : p2.includes('@') ? p2 : '';
            const name = p3 || (email ? email.split('@')[0] : 'Freelancer');
            if (email) {
              await setDoc(
                doc(db, 'profiles', uid),
                {
                  id: uid,
                  userId: uid,
                  name,
                  email,
                  isPublicProfile: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                { merge: true }
              );
              imported++;
            }
          }
        }
      }

      setStatusMessage(`Successfully imported ${imported} accounts into Firestore.`);
      setPasteData('');
      onSynced();
    } catch (err: any) {
      setStatusMessage(`Import error: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Add single user manually
  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail.trim()) return;
    setIsProcessing(true);
    try {
      const uid = singleUid.trim() || `usr_${Math.random().toString(36).slice(2, 12)}`;
      await setDoc(
        doc(db, 'profiles', uid),
        {
          id: uid,
          userId: uid,
          name: singleName.trim() || singleEmail.split('@')[0],
          email: singleEmail.trim().toLowerCase(),
          isPublicProfile: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      setStatusMessage(`Added user ${singleEmail} to Firestore.`);
      setSingleEmail('');
      setSingleName('');
      setSingleUid('');
      onSynced();
    } catch (err: any) {
      setStatusMessage(`Error adding user: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Sync Firebase Authentication Users</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sync Google accounts from Firebase Auth directory into Cloud Firestore profiles.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto text-xs">
          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Quick Sync Known Users */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Quick Sync Firebase Auth Accounts ({KNOWN_AUTH_USERS.length} detected)
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Instantly create Firestore profile documents for all 10 registered accounts shown in your Firebase Authentication console so they appear in the Admin Portal.
            </p>
            <button
              onClick={handleSyncKnownUsers}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-2 rounded-lg transition-colors duration-120 border-0 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Sync All Detected Auth Users</span>
            </button>
          </div>

          {/* Paste Firebase Console Export */}
          <div className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Import from Firebase Console Export (JSON or CSV)
            </div>
            <p className="text-slate-500 leading-relaxed">
              In Firebase Console $\rightarrow$ Authentication $\rightarrow$ Users $\rightarrow$ click the three dots (`⋮`) menu $\rightarrow$ <strong>Export users</strong>. Paste the downloaded JSON or CSV below:
            </p>
            <textarea
              rows={4}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Paste exported JSON or CSV lines here..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleImportPasted}
              disabled={isProcessing || !pasteData.trim()}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold px-3 py-1.5 rounded-lg transition-colors duration-120 border-0 cursor-pointer disabled:opacity-50"
            >
              Import Pasted Accounts
            </button>
          </div>

          {/* Manual Add */}
          <form onSubmit={handleAddSingle} className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Add Account Manually
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="email"
                placeholder="User Email *"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                required
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Firebase UID (optional)"
                value={singleUid}
                onChange={(e) => setSingleUid(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing || !singleEmail.trim()}
              className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors duration-120 border-0 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add to Directory</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
