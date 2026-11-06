/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, X, Play, ExternalLink, MessageSquare, CheckCircle2 } from 'lucide-react';
import { WorkItem, Client } from '../../types';
import StatusBadge from '../StatusBadge';
import { DeliverableFeedbackModal } from './DeliverableFeedbackModal';

interface ClientPortalWorkLogProps {
  workItems: WorkItem[];
  client?: Client | null;
  currentUserEmail?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'Uninvoiced' | 'Invoiced';
  onStatusFilterChange: (status: 'all' | 'Uninvoiced' | 'Invoiced') => void;
  onOpenVideoEmbed: (url: string, title: string) => void;
  onUpdateApproval: (
    itemId: string,
    status: 'approved' | 'changes_requested',
    commentText?: string,
    timestamp?: string
  ) => Promise<void>;
}

export const ClientPortalWorkLog: React.FC<ClientPortalWorkLogProps> = ({
  workItems,
  client,
  currentUserEmail,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenVideoEmbed,
  onUpdateApproval,
}) => {
  const [reviewItem, setReviewItem] = useState<WorkItem | null>(null);
  const filteredWork = workItems.filter((item) => {
    const matchesSearch = !searchQuery.trim() || item.description.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'Invoiced' && item.status === 'Invoiced') || (statusFilter === 'Uninvoiced' && item.status !== 'Invoiced');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Controls: Search input & Status filter buttons */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search work descriptions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'Uninvoiced', 'Invoiced'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {status === 'all' ? 'All Work' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filteredWork.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            No work items matching your criteria.
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< sm screens) */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWork.map((item) => {
                const totalItemAmount = (Number(item.quantity) || 1) * (Number(item.rate) || 0);
                return (
                  <div key={item.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-xs text-slate-900 dark:text-slate-100 leading-snug">{item.description}</div>
                      <StatusBadge status={item.status === 'Invoiced' ? 'Invoiced' : 'Pending'} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span>Qty: {item.quantity}</span>
                        <span>•</span>
                        <span>₹{item.rate}/ea</span>
                        <span>•</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">₹{totalItemAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {item.videoUrl && (
                      <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-50 dark:border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => onOpenVideoEmbed(item.videoUrl!, item.description)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white py-1.5 px-2 rounded-md min-h-[44px] cursor-pointer"
                        >
                          <Play size={13} />
                          <span>Watch Preview</span>
                        </button>
                        <a
                          href={item.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-slate-200 rounded-md min-h-[44px] min-w-[44px]"
                          title="Open external link"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.approvalStatus === 'approved' ? 'bg-[#4870aa]' : item.approvalStatus === 'changes_requested' ? 'bg-red-500' : 'bg-slate-500'}`} />
                        <span className={`font-medium ${item.approvalStatus === 'approved' ? 'text-indigo-400' : item.approvalStatus === 'changes_requested' ? 'text-red-400' : 'text-slate-400'}`}>
                          {item.approvalStatus === 'approved' ? 'Approved' : item.approvalStatus === 'changes_requested' ? `Changes Requested (${item.revisionCount || 1})` : 'Pending Review'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#282828] hover:bg-[#383838] border border-[#3a3a3a] rounded-lg transition-colors cursor-pointer"
                      >
                        <MessageSquare size={12} />
                        <span>Review</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / Tablet Table View (sm+ screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Rate</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Billing</th>
                    <th className="py-3 px-4">Approval</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredWork.map((item) => {
                    const totalItemAmount = (Number(item.quantity) || 1) * (Number(item.rate) || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-sm">{item.description}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{item.quantity}</td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">₹{item.rate.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">₹{totalItemAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4"><StatusBadge status={item.status === 'Invoiced' ? 'Invoiced' : 'Pending'} /></td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${item.approvalStatus === 'approved' ? 'bg-[#4870aa]' : item.approvalStatus === 'changes_requested' ? 'bg-red-500' : 'bg-slate-500'}`} />
                            <span className={`font-medium text-xs ${item.approvalStatus === 'approved' ? 'text-indigo-400' : item.approvalStatus === 'changes_requested' ? 'text-red-400' : 'text-slate-400'}`}>
                              {item.approvalStatus === 'approved' ? 'Approved' : item.approvalStatus === 'changes_requested' ? `Changes (${item.revisionCount || 1})` : 'Pending'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setReviewItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#282828] hover:bg-[#383838] border border-[#3a3a3a] rounded-md transition-colors cursor-pointer"
                              title="Review, Approve, or Request Changes"
                            >
                              <MessageSquare size={12} />
                              <span>Review</span>
                            </button>
                            {item.videoUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpenVideoEmbed(item.videoUrl!, item.description)}
                                  className="text-xs font-medium text-slate-300 hover:text-white inline-flex items-center gap-1 py-1 px-2 cursor-pointer"
                                  title="Watch Preview"
                                >
                                  <Play size={13} />
                                  <span>Preview</span>
                                </button>
                                <a
                                  href={item.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors inline-flex items-center justify-center"
                                  title="Open in external tab"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Review & Feedback Modal */}
      <DeliverableFeedbackModal
        isOpen={!!reviewItem}
        onClose={() => setReviewItem(null)}
        item={reviewItem}
        client={client}
        currentUserEmail={currentUserEmail}
        onUpdateApproval={onUpdateApproval}
      />
    </div>
  );
};
