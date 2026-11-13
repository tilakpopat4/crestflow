import React from 'react';
import { AUTOMATED_TRIGGERS } from './emailTriggersData';

export default function AdminAutomatedTriggersTable() {
  return (
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
  );
}

