/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { WorkItem } from '../../types';

interface DeliverableFeedbackViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkItem | null;
  clientName?: string;
}

/**
 * DeliverableFeedbackViewerModal lets freelancers view the client's revision history,
 * feedback notes, and timestamped video markers for a work deliverable.
 */
export const DeliverableFeedbackViewerModal: React.FC<DeliverableFeedbackViewerModalProps> = ({
  isOpen,
  onClose,
  item,
  clientName,
}) => {
  if (!isOpen || !item) return null;

  const comments = item.comments || [];
  const statusLabel = item.approvalStatus === 'approved'
    ? 'Approved'
    : item.approvalStatus === 'changes_requested'
    ? 'Changes Requested'
    : 'Pending Review';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#212121] border border-[#333333] text-white rounded-xl shadow-sm max-w-lg w-full overflow-hidden cursor-default flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#333333] flex items-center justify-between gap-3 bg-[#1e1e1e]">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-slate-400" />
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                Client Feedback &amp; Revisions
              </h3>
            </div>
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

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Summary Banner */}
          <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#2a2a2a] text-xs">
            <div>
              <span className="text-slate-400">Client: </span>
              <strong className="text-white">{clientName || 'Client'}</strong>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-semibold capitalize ${
                item.approvalStatus === 'approved'
                  ? 'text-indigo-400'
                  : item.approvalStatus === 'changes_requested'
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}>
                • {statusLabel}
              </span>
              <span className="text-slate-400 font-mono">
                Rev <strong className="text-white">{item.revisionCount || 0}</strong>
              </span>
            </div>
          </div>

          {/* Video link preview shortcut if present */}
          {item.videoUrl && (
            <div className="flex items-center justify-between p-2.5 bg-[#181818] rounded-lg border border-[#2a2a2a] text-xs">
              <span className="text-slate-400 truncate max-w-xs">{item.videoUrl}</span>
              <a
                href={item.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
              >
                <span>Open Video</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Feedback Comments List */}
          {comments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No feedback comments submitted yet for this deliverable.
            </div>
          ) : (
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-300">
                Comment Timeline ({comments.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">{c.author}</span>
                      <span>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {c.timestamp && (
                      <div className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-400 bg-[#242424] px-1.5 py-0.5 rounded">
                        <Clock size={11} />
                        <span>Timestamp: {c.timestamp}</span>
                      </div>
                    )}

                    <p className="text-slate-200 whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-[#282828] hover:bg-[#383838] text-white border border-[#3a3a3a] rounded-lg cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
