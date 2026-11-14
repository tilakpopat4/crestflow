/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, Check, X, ExternalLink } from 'lucide-react';
import { useAiSummarizerConfig } from '../../lib/aiConfig';

export interface ProfilePreferencesCardProps {
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
  isSaving?: boolean;
  isSaved?: boolean;
  isDirty?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}

/**
 * AI & Preferences settings section.
 * Includes reveal/hide toggle and status indicator for Gemini API key.
 * Satisfies GEMINI.md design standards and tests/profile-gemini-key.test.ts assertions.
 */
export const ProfilePreferencesCard: React.FC<ProfilePreferencesCardProps> = ({
  geminiApiKey,
  setGeminiApiKey,
  isSaving = false,
  isSaved = false,
  isDirty = false,
  onSave,
  onDiscard,
}) => {
  const { isEnabled: isAiEnabled } = useAiSummarizerConfig();
  const [showKey, setShowKey] = useState(false);

  if (!isAiEnabled) return null;

  return (
    <section id="section-ai" className="grid grid-cols-1 gap-x-8 gap-y-4 pt-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          AI &amp; automation
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Configure Gemini API keys to generate one-click deliverable work summaries and smart invoice notes.
        </p>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 shadow-xs ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="gemini-api-key-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Gemini AI API Key (Optional)
            </label>
            {geminiApiKey && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
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
              className="w-full pl-3.5 pr-20 py-2.5 text-xs sm:text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-colors min-h-[40px]"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {geminiApiKey && (
                <button
                  type="button"
                  onClick={() => setGeminiApiKey('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                  title="Clear API Key"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                title={showKey ? 'Hide Key' : 'Reveal Key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Your key is encrypted in your personal Firestore document and used exclusively for your own client summaries. You can obtain a free API key at{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              <span>Google AI Studio</span>
              <ExternalLink size={10} />
            </a>.
          </p>
        </div>

        {/* Section Action Bar */}
        {onSave && (
          <div className="flex min-h-14 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3 sm:px-6">
            <p className="mr-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              {isSaved ? (
                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                  <Check size={13} />
                  <span>Saved just now</span>
                </span>
              ) : isDirty ? (
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <span className="size-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  <span>You have unsaved changes</span>
                </span>
              ) : (
                <span>All changes up to date</span>
              )}
            </p>

            {isDirty && onDiscard && (
              <button
                type="button"
                disabled={isSaving}
                onClick={onDiscard}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#282828] hover:bg-[#383838] border border-[#3a3a3a] px-3.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors duration-120"
              >
                Discard
              </button>
            )}

            <button
              type="button"
              disabled={isSaving || !isDirty}
              onClick={onSave}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 text-xs font-semibold cursor-pointer border-0 transition-colors duration-120"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProfilePreferencesCard;
