import React, { useState, useMemo } from 'react';
import { X, Send, Eye, Edit3, RefreshCw } from 'lucide-react';
import { auth } from '../../firebase';
import { AdminUserUnified } from '../../hooks/useAdminUsersAndHistory';
import AdminCampaignPreview from './AdminCampaignPreview';
import AdminCampaignAudienceSelector, { AudienceType } from './AdminCampaignAudienceSelector';
import AdminCampaignFormInputs from './AdminCampaignFormInputs';

export interface AdminCampaignPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users?: AdminUserUnified[];
  onCampaignDispatched?: () => void;
}

/**
 * AdminCampaignPlannerModal enables administrators to plan promotional emails,
 * select user cohorts, preview live HTML, and execute bulk email dispatches.
 * Strictly adheres to GEMINI.md design standards: no emojis, flat aesthetic.
 */
export default function AdminCampaignPlannerModal({
  isOpen,
  onClose,
  users = [],
  onCampaignDispatched,
}: AdminCampaignPlannerModalProps) {
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [message, setMessage] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'immediate' | 'schedule'>('immediate');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Compute resolved recipients based on audience selection
  const targetedRecipients = useMemo(() => {
    if (audienceType === 'custom') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const raw = customEmails.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      const unique = Array.from(new Set(raw));
      return unique.filter((e) => emailRegex.test(e)).map((email) => ({ email, name: email.split('@')[0] }));
    }

    const validPlatformUsers = users.filter((u) => u.email && u.email.includes('@'));
    if (audienceType === 'active') {
      return validPlatformUsers.filter((u) => u.subscription_status === 'active').map((u) => ({ email: u.email, name: u.name, uid: u.id }));
    }
    if (audienceType === 'inactive') {
      return validPlatformUsers.filter((u) => u.subscription_status !== 'active').map((u) => ({ email: u.email, name: u.name, uid: u.id }));
    }
    return validPlatformUsers.map((u) => ({ email: u.email, name: u.name, uid: u.id }));
  }, [audienceType, customEmails, users]);

  if (!isOpen) return null;

  const handleSendTest = async () => {
    if (!subject.trim() || !headline.trim() || !message.trim()) {
      setFeedback({ success: false, text: 'Please fill in Subject, Headline, and Message before testing' });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Admin authentication required');

      const res = await fetch('/api/admin/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: subject,
          headline,
          message,
          bannerText: bannerText || undefined,
          actionLabel: actionLabel || undefined,
          actionUrl: actionUrl || undefined,
          recipients: [{ email: 'tilakpopat2007@gmail.com', name: 'Admin' }],
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.success) throw new Error(data.error || 'Test delivery failed');
      setFeedback({ success: true, text: 'Test copy dispatched to tilakpopat2007@gmail.com. Check your inbox.' });
      onCampaignDispatched?.();
    } catch (err: any) {
      setFeedback({ success: false, text: `Test failed: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDispatchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !headline.trim() || !message.trim()) {
      setFeedback({ success: false, text: 'Subject, Headline, and Message body are required' });
      return;
    }
    if (targetedRecipients.length === 0) {
      setFeedback({ success: false, text: 'No valid recipient emails in selected audience' });
      return;
    }

    let scheduledEpoch: number | undefined;
    if (deliveryMode === 'schedule') {
      if (!scheduledDateTime) {
        setFeedback({ success: false, text: 'Please pick a schedule date and time' });
        return;
      }
      scheduledEpoch = new Date(scheduledDateTime).getTime();
      if (scheduledEpoch <= Date.now()) {
        setFeedback({ success: false, text: 'Scheduled time must be in the future' });
        return;
      }
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Admin authentication required');

      const res = await fetch('/api/admin/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject,
          headline,
          message,
          bannerText: bannerText || undefined,
          actionLabel: actionLabel || undefined,
          actionUrl: actionUrl || undefined,
          recipients: targetedRecipients,
          scheduledAt: scheduledEpoch,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to dispatch campaign');

      setFeedback({ success: true, text: data.message || 'Campaign processed successfully' });
      onCampaignDispatched?.();
      setTimeout(() => onClose(), 2200);
    } catch (err: any) {
      setFeedback({ success: false, text: `Dispatch error: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 overflow-y-auto">
      <div className="bg-[#212121] rounded-xl max-w-2xl w-full border border-[#333333] shadow-xl overflow-hidden my-auto text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#333333] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-white">
              Promotional Campaign & Bulk Mail Planner
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target user segments, schedule future announcements, or broadcast instant updates
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex border-b border-[#333333] px-5 text-xs font-medium bg-[#1a1a1a]">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`py-3 px-3 inline-flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'compose' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Composer & Targeting</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-3 inline-flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preview' ? 'border-indigo-500 text-white font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Inbox Preview</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {feedback && (
            <div className={`p-3 rounded-lg text-xs border ${feedback.success ? 'bg-[#181818] border-slate-700 text-slate-200' : 'bg-red-950/40 border-red-900 text-red-300'}`}>
              {feedback.text}
            </div>
          )}

          {activeTab === 'preview' ? (
            <AdminCampaignPreview
              subject={subject}
              headline={headline}
              message={message}
              bannerText={bannerText}
              actionLabel={actionLabel}
              actionUrl={actionUrl}
            />
          ) : (
            <form onSubmit={handleDispatchCampaign} className="space-y-4 text-xs">
              {/* Audience Targeting */}
              <AdminCampaignAudienceSelector
                audienceType={audienceType}
                setAudienceType={setAudienceType}
                customEmails={customEmails}
                setCustomEmails={setCustomEmails}
                users={users}
                targetedCount={targetedRecipients.length}
              />

              {/* Message Details */}
              <AdminCampaignFormInputs
                subject={subject}
                setSubject={setSubject}
                bannerText={bannerText}
                setBannerText={setBannerText}
                headline={headline}
                setHeadline={setHeadline}
                message={message}
                setMessage={setMessage}
                actionLabel={actionLabel}
                setActionLabel={setActionLabel}
                actionUrl={actionUrl}
                setActionUrl={setActionUrl}
              />

              {/* Delivery Timing */}
              <div className="p-3 bg-[#181818] rounded-lg flex flex-wrap items-center justify-between gap-3 border border-[#2e2e2e]">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input type="radio" name="delMode" checked={deliveryMode === 'immediate'} onChange={() => setDeliveryMode('immediate')} className="accent-indigo-500" />
                    <span>Send Immediately</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input type="radio" name="delMode" checked={deliveryMode === 'schedule'} onChange={() => setDeliveryMode('schedule')} className="accent-indigo-500" />
                    <span>Schedule For Future</span>
                  </label>
                </div>

                {deliveryMode === 'schedule' && (
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="p-1.5 bg-[#1e1e1e] border border-[#333333] rounded text-white text-xs outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isTesting}
                  className="px-3.5 py-2 bg-[#282828] hover:bg-[#333333] text-slate-300 hover:text-white rounded-lg font-medium cursor-pointer transition-colors disabled:opacity-50 border-0"
                >
                  {isTesting ? 'Sending Test...' : 'Send Test Copy to Self'}
                </button>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 border border-[#333333] bg-[#1e1e1e] rounded-lg text-slate-400 hover:text-white hover:bg-[#252525] cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || targetedRecipients.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 border-0"
                  >
                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{deliveryMode === 'schedule' ? 'Schedule Campaign' : `Broadcast to ${targetedRecipients.length} Users`}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
