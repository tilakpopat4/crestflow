import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

/**
 * Standard Design System Segmented Tabs.
 * Restrained surface-600 container with surface-500 active state and 120ms transition.
 */
export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-surface-600 border border-surface-400 rounded-lg select-none",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer border-0",
              isActive
                ? "bg-surface-500 text-text-primary shadow-xs border border-surface-400/80"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-500/50"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums",
                  isActive
                    ? "bg-surface-600 text-text-primary"
                    : "bg-surface-700 text-text-secondary"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
