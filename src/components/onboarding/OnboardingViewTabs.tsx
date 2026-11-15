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
    <div className="flex items-center gap-1.5 p-1 bg-[#212121] border border-[#333333] rounded-lg mb-4 self-start">
      <button
        type="button"
        onClick={() => onSelectView('intake')}
        className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
          activeView === 'intake'
            ? 'bg-[#282828] text-white shadow-xs border border-[#444444]'
            : 'text-slate-400 hover:text-white bg-transparent border border-transparent'
        }`}
      >
        Intake Brief Form
      </button>
      <button
        type="button"
        onClick={() => onSelectView('samples')}
        className={`px-3.5 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
          activeView === 'samples'
            ? 'bg-[#282828] text-white shadow-xs border border-[#444444]'
            : 'text-slate-400 hover:text-white bg-transparent border border-transparent'
        }`}
      >
        View Samples ({samplesCount})
      </button>
    </div>
  );
};

export default OnboardingViewTabs;
