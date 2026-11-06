/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, CheckCircle2, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { WorkItem, Client, DeliverableComment } from '../../types';

interface DeliverableFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkItem | null;
  client?: Client | null;
  currentUserEmail?: string;
  onUpdateApproval: (
    itemId: string,
    status: 'approved' | 'changes_requested',
    commentText?: string,
    timestamp?: string
  ) => Promise<void>;
}

/**
 * DeliverableFeedbackModal allows clients to review, approve, or request revisions
 * on individual deliverables with timestamped video notes.
 */
export const DeliverableFeedbackModal: React.FC<DeliverableFeedbackModalProps> = ({
  isOpen,
  onClose,
  item,
  client,
  currentUserEmail,
  onUpdateApproval,
}) => {
  if (!isOpen || !item) return null;

  const [mode, setMode] = useState<'view' | 'request_changes' | 'approve'>('view');
  const [commentText, setCommentText] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentRevisions = item.revisionCount || 0;
  const revisionsIncluded = client?.revisionsIncluded;
  const isVideo = Boolean(item.videoUrl);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onUpdateApproval(item.id, 'approved', commentText.trim() || undefined);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve deliverable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setErrorMsg('Please describe the changes needed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onUpdateApproval(
        item.id,
        'changes_requested',
        commentText.trim(),
        timestamp.trim() || undefined
      );
      setCommentText('');
      setTimestamp('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit revision request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#212121] border border-[#333333] text-white rounded-xl shadow-sm max-w-lg w-full overflow-hidden cursor-default flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#333333] flex items-center justify-between gap-3 bg-[#1e1e1e]">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white truncate">
              Deliverable Review
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {item.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#282828] transition-colors cursor-pointer border-none"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Status & Revision Counter Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#181818] rounded-lg border border-[#2a2a2a] text-xs">
            <div>
              <span className="text-slate-400">Current Status: </span>
              <span className={`font-semibold capitalize ${
                item.approvalStatus === 'approved'
                  ? 'text-indigo-400'
                  : item.approvalStatus === 'changes_requested'
                  ? 'text-red-400'
                  : 'text-slate-300'
              }`}>
                {item.approvalStatus ? item.approvalStatus.replace('_', ' ') : 'Pending Review'}
              </span>
            </div>
            <div className="text-slate-400 font-mono">
              Revisions: <strong className="text-white">{currentRevisions}</strong>
              {revisionsIncluded !== undefined && (
                <span> of {revisionsIncluded} included</span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Feedback & Comments History */}
          {item.comments && item.comments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare size={13} />
                <span>Revision History ({item.comments.length})</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {item.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium text-slate-300">{c.author}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {c.timestamp && (
                      <div className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-400 bg-[#242424] px-1.5 py-0.5 rounded">
                        <Clock size={11} />
                        <span>{c.timestamp}</span>
                      </div>
                    )}
                    <p className="text-slate-200 whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode Switch or Forms */}
          {mode === 'view' && (
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setMode('approve')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#282828] hover:bg-[#383838] text-white border border-[#3a3a3a] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Approve Deliverable</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('request_changes')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#282828] hover:bg-[#383838] text-slate-300 hover:text-white border border-[#3a3a3a] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>Request Changes</span>
              </button>
            </div>
          )}

          {mode === 'approve' && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-300">
                Are you satisfied with this deliverable? Approving notifies your freelancer that this work item is complete.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-[#1a1a1a] rounded-lg cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#282828] hover:bg-[#383838] text-white border border-[#3a3a3a] rounded-lg cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Approving…' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          )}

          {mode === 'request_changes' && (
            <form onSubmit={handleRequestChanges} className="space-y-3 pt-2">
              {isVideo && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Video Timestamp (Optional, e.g. 01:23)</span>
                  </label>
                  <input
                    type="text"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    placeholder="e.g. 01:23 or 00:45"
                    pattern="^[0-9]{1,2}:[0-9]{2}$"
                    title="Format: MM:SS (e.g. 01:23)"
                    className="w-full bg-[#181818] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Notes / Revision Feedback
                </label>
                <textarea
                  required
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Describe specifically what changes you would like to see..."
                  className="w-full bg-[#181818] border border-[#333333] rounded-lg p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#333333]">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-[#1a1a1a] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#282828] hover:bg-[#383838] text-white border border-[#3a3a3a] rounded-lg cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Revision Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
