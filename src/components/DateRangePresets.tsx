import React from 'react';

interface DateRangePresetsProps {
  activePreset: string;
  onSelectPreset: (key: string) => void;
  className?: string;
}

export const PRESET_OPTIONS: Array<[string, string]> = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['month', 'This month'],
  ['last-month', 'Last month'],
  ['year', 'This year']
];

export const DateRangePresets: React.FC<DateRangePresetsProps> = ({
  activePreset,
  onSelectPreset,
  className = ''
}) => {
  return (
    <fieldset className={`min-w-0 border-slate-200 dark:border-slate-800 sm:w-36 sm:shrink-0 sm:border-r sm:p-2 ${className}`}>
      <legend className="sr-only">Presets</legend>
      <div className="flex gap-1.5 overflow-x-auto px-3 py-1 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:p-0 [scrollbar-width:none]">
        {PRESET_OPTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectPreset(key)}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium text-left whitespace-nowrap transition-colors cursor-pointer ${
              activePreset === key
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
};
