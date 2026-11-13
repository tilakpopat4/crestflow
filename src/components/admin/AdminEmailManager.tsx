import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Send, Server, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { AUTOMATED_TRIGGERS } from './emailTriggersData';
import { auth } from '../../firebase';
import AdminEmailHistoryTable from './AdminEmailHistoryTable';
import AdminCampaignPlannerModal from './AdminCampaignPlannerModal';
import AdminAutomatedTriggersTable from './AdminAutomatedTriggersTable';
import { AdminUserUnified } from '../../hooks/useAdminUsersAndHistory';

interface AdminEmailManagerProps {
  users?: AdminUserUnified[];
}

/**
 * AdminEmailManager renders direct Gmail connection management,
 * email infrastructure metrics, live test dispatch, campaign planner, and automated triggers.
 */
export default function AdminEmailManager({ users = [] }: AdminEmailManagerProps) {
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  // Direct Gmail Connection State
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  useEffect(() => {
    auth.currentUser?.getIdToken().then((token) => {
      if (!token) return;
      fetch('/api/admin/gmail/config', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.isConnected) setIsGmailConnected(true);
          if (d.clientId) setClientId(d.clientId);
        })
        .catch(() => {});
    });
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = testEmail.trim() || 'support.crestflow@gmail.com';
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in as administrator to dispatch test emails');

      const res = await fetch('/api/notify/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetEmail: recipient }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.success) throw new Error(data.error || `Dispatch failed (${res.status})`);

      setTestResult({
        success: true,
        message: `Live test email dispatched successfully to ${recipient} via ${data.provider || 'Direct Gmail'}.`,
      });
      setHistoryRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      setTestResult({ success: false, message: `Failed to deliver test email: ${err.message}` });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigFeedback(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Admin authorization required');
      const res = await fetch('/api/admin/gmail/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientId, clientSecret, refreshToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save configuration');
      setIsGmailConnected(data.isConnected);
      setConfigFeedback('Gmail API credentials saved successfully.');
      setIsConfigOpen(false);
    } catch (err: any) {
      setConfigFeedback(err.message);
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Promotional Campaign & Bulk Mail Action Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs border border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Promotional Campaigns & Bulk Mail
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Design announcements, target user cohorts or custom email lists, and broadcast directly through support.crestflow@gmail.com.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsConfigOpen((v) => !v)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-120 border-0 flex items-center gap-1.5 shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Gmail API Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCampaignModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-120 border-0 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Plan & Send Bulk Mail</span>
          </button>
        </div>
      </div>

      {/* Gmail Config Modal / Drawer */}
      {isConfigOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Direct Gmail REST API Configuration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Connect support.crestflow@gmail.com via Google Cloud OAuth2</p>
            </div>
            <button type="button" onClick={() => setIsConfigOpen(false)} className="text-xs text-slate-400 hover:text-white bg-transparent border-none cursor-pointer">Close</button>
          </div>
          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Google Client ID</label>
              <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="...apps.googleusercontent.com" className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Google Client Secret</label>
              <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="GOCSPX-..." className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Refresh Token (Offline Scope)</label>
              <input type="password" value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} placeholder="1//04..." className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white outline-none" />
            </div>
            <div className="sm:col-span-3 flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">{configFeedback}</span>
              <button type="submit" disabled={configSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold border-none cursor-pointer">{configSaving ? 'Saving...' : 'Save Gmail Connection'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Primary Sender</div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-mono truncate">support.crestflow@gmail.com</div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isGmailConnected ? 'Google API Active' : 'Gmail Direct Ready'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delivery Provider</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Direct GMail</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Google Cloud Mail REST API</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Engine Protocol</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">OAuth2 MIME</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">500 Emails / Day Free</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Automated Triggers</div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{AUTOMATED_TRIGGERS.length} Active</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Zero Emojis &bull; Native Google Dispatch</div>
        </div>
      </div>

      {/* Provider Details & Test Sender Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Connected Mail Infrastructure</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">support.crestflow@gmail.com</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Mail Sender</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">support.crestflow@gmail.com</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Google API Scope</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">gmail.send</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Delivery Endpoint</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">gmail.googleapis.com</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Sent Box Sync</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">Automatic in Gmail App</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
            Emails dispatched from CrestFlow originate directly from <strong>support.crestflow@gmail.com</strong> through Google's authenticated infrastructure.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Send Test Dispatch</h3>
          </div>
          <form onSubmit={handleSendTest} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Recipient Email</label>
              <input type="email" placeholder="support.crestflow@gmail.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600" />
            </div>
            <button type="submit" disabled={isSendingTest} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-120 border-0 flex items-center justify-center gap-1.5">
              {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isSendingTest ? 'Sending...' : 'Dispatch Live Test'}</span>
            </button>
          </form>
          {testResult && (
            <div className={`p-3 rounded-lg text-xs ${testResult.success ? 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'}`}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Live Mail History Log with Clear History */}
      <AdminEmailHistoryTable refreshSignal={historyRefreshKey} />

      {/* Automated Triggers Directory Table */}
      <AdminAutomatedTriggersTable />

      {/* Promotional Campaign Planner & Bulk Mail Modal */}
      <AdminCampaignPlannerModal isOpen={isCampaignModalOpen} onClose={() => setIsCampaignModalOpen(false)} users={users} onCampaignDispatched={() => setHistoryRefreshKey((prev) => prev + 1)} />
    </div>
  );
}
