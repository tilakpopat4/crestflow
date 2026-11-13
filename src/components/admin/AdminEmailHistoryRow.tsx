import React from 'react';
import { EmailRecord } from './AdminEmailHistoryTable';

interface AdminEmailHistoryRowProps {
  item: EmailRecord;
  onInspect: (item: EmailRecord) => void;
  onRetry: (jobId: string) => void;
  isRetrying: boolean;
  formatDate: (timestamp?: number) => string;
}

/**
 * AdminEmailHistoryRow renders an individual email dispatch log item.
 * Strictly adheres to GEMINI.md design standards: flat, restrained SaaS aesthetic,
 * plain text status with solid 6px dot, no pills, no emojis.
 */
export default function AdminEmailHistoryRow({
  item,
  onInspect,
  onRetry,
  isRetrying,
  formatDate,
}: AdminEmailHistoryRowProps) {
  const isSent = item.status === 'sent';
  const isFailed = item.status === 'failed' || item.status === 'retry_pending';

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSent
                ? 'bg-indigo-600 dark:bg-indigo-400'
                : isFailed
                ? 'bg-red-600 dark:bg-red-400'
                : 'bg-slate-400'
            }`}
          />
          <span
            className={
              isSent
                ? 'text-indigo-600 dark:text-indigo-400'
                : isFailed
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-500 dark:text-slate-400'
            }
          >
            {isSent ? 'Sent' : isFailed ? 'Failed' : item.status}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-900 dark:text-slate-100">
        {item.recipient}
      </td>
      <td className="py-3 px-4 max-w-xs">
        <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={item.subject}>
          {item.subject || item.eventType}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {item.eventType}
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
        {formatDate(item.sentAt || item.createdAt)}
      </td>
      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[140px] truncate" title={item.providerMessageId || item.jobId}>
        {item.providerMessageId || item.jobId}
      </td>
      <td className="py-3 px-4 whitespace-nowrap text-right space-x-1">
        <button
          type="button"
          onClick={() => onInspect(item)}
          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs cursor-pointer transition-colors"
        >
          Inspect
        </button>
        {isFailed && (
          <button
            type="button"
            onClick={() => onRetry(item.jobId)}
            disabled={isRetrying}
            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </td>
    </tr>
  );
}

