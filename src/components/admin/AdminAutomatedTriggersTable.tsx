import React from 'react';
import { AUTOMATED_TRIGGERS } from './emailTriggersData';

export default function AdminAutomatedTriggersTable() {
  return (
    <div className="bg-[#131318] dark:bg-[#131318] rounded-xl overflow-hidden shadow-2xs">
      <div className="p-4 sm:p-5 border-b border-[#2A2A33] dark:border-[#2A2A33] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-[#F7F7F8] dark:text-[#F7F7F8]">
            Automated Notification Directory
          </h3>
          <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] mt-0.5">
            Live lifecycle events triggered automatically across the platform
          </p>
        </div>
        <span className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] font-medium">
          {AUTOMATED_TRIGGERS.length} Operational
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#131318] dark:bg-[#1B1B22] text-[#A1A1AA] dark:text-[#A1A1AA] border-b border-[#2A2A33] dark:border-[#2A2A33]">
            <tr>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Occasion</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Trigger Condition</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Recipient</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Subject Template</th>
              <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A33] dark:divide-[#2A2A33] text-[#A1A1AA] dark:text-[#A1A1AA]">
            {AUTOMATED_TRIGGERS.map((t) => (
              <tr key={t.id} className="hover:bg-[#131318]/50 dark:hover:bg-[#1B1B22] transition-colors">
                <td className="py-3 px-4 font-semibold text-[#F7F7F8] dark:text-[#F7F7F8] whitespace-nowrap">
                  {t.name}
                </td>
                <td className="py-3 px-4 text-[#A1A1AA] dark:text-[#A1A1AA] min-w-[200px]">
                  {t.triggerEvent}
                </td>
                <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#A1A1AA] dark:text-[#A1A1AA]">
                  {t.recipient}
                </td>
                <td className="py-3 px-4 text-[#A1A1AA] dark:text-[#A1A1AA] max-w-xs truncate" title={t.subject}>
                  {t.subject}
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-[#FF2D4A] dark:text-[#FF2D4A] font-medium">
                  &bull; {t.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

