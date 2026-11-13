import React, { useState } from 'react';
import { Mail, CheckCircle2, Send, Server, RefreshCw } from 'lucide-react';
import { AUTOMATED_TRIGGERS } from './emailTriggersData';
import { auth } from '../../firebase';

/**
 * AdminEmailManager renders email infrastructure metrics, configuration IDs,
 * interactive live test mail dispatch, and the directory of automated email triggers.
 * Follows GEMINI.md design standards: flat, restrained SaaS aesthetic, no emojis.
 */
export default function AdminEmailManager() {
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = testEmail.trim() || 'tilakpopat2007@gmail.com';
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Please sign in to authorized admin account to dispatch test emails');
      }

      const res = await fetch('/api/notify/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetEmail: recipient }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server dispatch failed (${res.status})`);
      }

      setTestResult({
        success: true,
        message: `Live test email dispatched successfully to ${recipient} via ${data.provider} (ID: ${data.id}). Please check your Inbox and Spam folder.`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Failed to deliver test email: ${err.message}`,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Primary Sender
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-mono truncate">
            support.crestflow@gmail.com
          </div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Google OAuth Connected</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Delivery Provider
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            EmailJS
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Direct Gmail SMTP Engine
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Fallback Service
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Resend API
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Standby Failover Delivery
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Automated Triggers
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {AUTOMATED_TRIGGERS.length} Active
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Zero Emojis &bull; DMARC Compliant
          </div>
        </div>
      </div>

      {/* Provider Details & Test Sender Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Infrastructure Details */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Connected Mail Infrastructure
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
              support.crestflow@gmail.com
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Service ID</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">service_u6nm96l</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Template ID</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">template_g3ojhpa</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Public Key</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">MY75lMNsMx8rYRLa4</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-500 dark:text-slate-400 block font-medium">Reply-To Routing</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">support.crestflow@gmail.com</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
            All customer inquiries, contact submissions, and automated notifications route directly to and from <strong>support.crestflow@gmail.com</strong> without displaying sandbox headers.
          </p>
        </div>

        {/* Right 1 Col: Interactive Test Sender */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Send Test Dispatch
            </h3>
          </div>

          <form onSubmit={handleSendTest} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                placeholder="support.crestflow@gmail.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingTest}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-120 border-0 flex items-center justify-center gap-1.5"
            >
              {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isSendingTest ? 'Sending...' : 'Dispatch Live Test'}</span>
            </button>
          </form>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs ${
                testResult.success
                  ? 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Automated Triggers Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Automated Notification Directory
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live lifecycle events triggered automatically across the platform
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {AUTOMATED_TRIGGERS.length} Operational
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Occasion</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Trigger Condition</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Recipient</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Subject Template</th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {AUTOMATED_TRIGGERS.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {t.name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 min-w-[200px]">
                    {t.triggerEvent}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {t.recipient}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={t.subject}>
                    {t.subject}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-medium">
                    &bull; {t.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
