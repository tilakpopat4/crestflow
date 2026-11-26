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
    <tr className="hover:bg-[#131318]/50 dark:hover:bg-[#1B1B22] transition-colors">
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSent
                ? 'bg-[#E0002B] dark:bg-indigo-400'
                : isFailed
                ? 'bg-[#E0002B] dark:bg-red-400'
                : 'bg-[#2A2A33]'
            }`}
          />
          <span
            className={
              isSent
                ? 'text-[#FF2D4A] dark:text-[#FF2D4A]'
                : isFailed
                ? 'text-[#E0002B] dark:text-[#F0607A]'
                : 'text-[#A1A1AA] dark:text-[#A1A1AA]'
            }
          >
            {isSent ? 'Sent' : isFailed ? 'Failed' : item.status}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap font-mono text-[#F7F7F8] dark:text-[#F7F7F8]">
        {item.recipient}
      </td>
      <td className="py-3 px-4 max-w-xs">
        <div className="font-medium text-[#F7F7F8] dark:text-[#F7F7F8] truncate" title={item.subject}>
          {item.subject || item.eventType}
        </div>
        <div className="text-[11px] text-[#A1A1AA] font-mono">
          {item.eventType}
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap text-[#A1A1AA] dark:text-[#A1A1AA]">
        {formatDate(item.sentAt || item.createdAt)}
      </td>
      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#A1A1AA] dark:text-[#A1A1AA] max-w-[140px] truncate" title={item.providerMessageId || item.jobId}>
        {item.providerMessageId || item.jobId}
      </td>
      <td className="py-3 px-4 whitespace-nowrap text-right space-x-1">
        <button
          type="button"
          onClick={() => onInspect(item)}
          className="px-2 py-1 bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] dark:hover:bg-[#1B1B22] text-[#A1A1AA] dark:text-[#A1A1AA] rounded text-xs cursor-pointer transition-colors"
        >
          Inspect
        </button>
        {isFailed && (
          <button
            type="button"
            onClick={() => onRetry(item.jobId)}
            disabled={isRetrying}
            className="px-2 py-1 bg-accent hover:bg-accent-hover text-white rounded text-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </td>
    </tr>
  );
}

