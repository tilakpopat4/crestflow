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
    <div className="flex items-center gap-1 p-1 bg-[#131318] border-0 rounded-lg mb-4 self-start">
      <button
        type="button"
        onClick={() => onSelectView('intake')}
        className={`px-3.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors border-0 ${
          activeView === 'intake'
            ? 'bg-[#1B1B22] text-white'
            : 'text-[#A1A1AA] hover:text-white bg-transparent'
        }`}
      >
        Intake Brief
      </button>
      <button
        type="button"
        onClick={() => onSelectView('samples')}
        className={`px-3.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors border-0 ${
          activeView === 'samples'
            ? 'bg-[#1B1B22] text-white'
            : 'text-[#A1A1AA] hover:text-white bg-transparent'
        }`}
      >
        Samples ({samplesCount})
      </button>
    </div>
  );
};

export default OnboardingViewTabs;
