import React from 'react';
import { KeyRound } from 'lucide-react';

interface ProfilePreferencesCardProps {
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
}

export const ProfilePreferencesCard: React.FC<ProfilePreferencesCardProps> = ({
  geminiApiKey,
  setGeminiApiKey
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span>AI &amp; Automation Integrations</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure API credentials for automated deliverable workflows.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Gemini AI API Key (Optional)
        </label>
        <input
          type="password"
          placeholder="AI Work Summarizer Key (AIza...)"
          value={geminiApiKey}
          onChange={(e) => setGeminiApiKey(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Stored securely in your private Firestore subcollection. Enables automated one-click summaries of deliverables and client progress notes.
        </p>
      </div>
    </div>
  );
};
