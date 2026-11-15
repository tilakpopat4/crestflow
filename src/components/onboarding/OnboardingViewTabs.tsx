import React from 'react';

interface OnboardingViewTabsProps {
  activeView: 'intake' | 'samples';
  samplesCount: number;
  onSelectView: (view: 'intake' | 'samples') => void;
}

export const OnboardingViewTabs: React.FC<OnboardingViewTabsProps> = ({
  activeView,
  samplesCount,
  onSelectView,
}) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg mb-4 self-start">
      <button
        type="button"
        onClick={() => onSelectView('intake')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md border-0 cursor-pointer transition-colors ${
          activeView === 'intake'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-transparent'
        }`}
      >
        Intake Brief Form
      </button>
      <button
        type="button"
        onClick={() => onSelectView('samples')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md border-0 cursor-pointer transition-colors ${
          activeView === 'samples'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-transparent'
        }`}
      >
        View Samples ({samplesCount})
      </button>
    </div>
  );
};

export default OnboardingViewTabs;
