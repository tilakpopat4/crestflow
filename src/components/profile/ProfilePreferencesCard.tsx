/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';

interface ProfilePreferencesCardProps {
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
}

/**
 * AI & Preferences card in Profile settings.
 * Includes reveal/hide toggle and status indicator for Gemini API key.
 */
export const ProfilePreferencesCard: React.FC<ProfilePreferencesCardProps> = ({
  geminiApiKey,
  setGeminiApiKey
}) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>AI &amp; Automation Integrations</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure API credentials for automated deliverable workflows.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="gemini-api-key-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Gemini AI API Key (Optional)
          </label>
          {geminiApiKey && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <CheckCircle2 size={12} className="text-indigo-600 dark:text-indigo-400" />
              <span>Key configured</span>
            </span>
          )}
        </div>

        <div className="relative flex items-center">
          <input
            id="gemini-api-key-input"
            type={showKey ? 'text' : 'password'}
            placeholder="AI Work Summarizer Key (AIza...)"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-3.5 pr-20 py-2.5 text-xs sm:text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors min-h-[44px]"
          />

          <div className="absolute right-1.5 flex items-center gap-0.5">
            {geminiApiKey && (
              <button
                type="button"
                onClick={() => setGeminiApiKey('')}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md"
                title="Clear API Key"
                aria-label="Clear API Key"
              >
                <X size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md"
              title={showKey ? 'Hide API Key' : 'Show API Key'}
              aria-label={showKey ? 'Hide API Key' : 'Show API Key'}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Stored securely in your private Firestore settings subcollection. Enables one-click work summaries on your dashboard.
        </p>
      </div>
    </div>
  );
};
