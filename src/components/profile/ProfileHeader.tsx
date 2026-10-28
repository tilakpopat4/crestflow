import React from 'react';
import { Save, Check } from 'lucide-react';

interface ProfileHeaderProps {
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ isSaving, isSaved, onSave }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Profile &amp; Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your creator branding, UPI invoice details, and workspace preferences.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {isSaved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            <Check size={14} />
            <span>Changes saved</span>
          </span>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs border-none"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
};
