import React from 'react';
import { clsx } from 'clsx';

interface SidebarResizerProps {
  isResizing: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  currentWidth: number;
  minWidth: number;
  maxWidth: number;
  onStepWidth?: (delta: number) => void;
  onResetWidth?: () => void;
}

/**
 * SidebarResizer renders a desktop drag handle along the right border of the sidebar,
 * enabling users to freely resize the left navigation bar.
 */
export const SidebarResizer: React.FC<SidebarResizerProps> = ({
  isResizing,
  onPointerDown,
  onDoubleClick,
  currentWidth,
  minWidth,
  maxWidth,
  onStepWidth,
  onResetWidth,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onStepWidth?.(e.shiftKey ? -25 : -10);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onStepWidth?.(e.shiftKey ? 25 : 10);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onResetWidth?.();
    }
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize navigation sidebar"
      aria-valuenow={currentWidth}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        "hidden md:block absolute top-0 -right-1.5 w-3 h-full cursor-col-resize select-none z-30 group outline-none",
        isResizing && "cursor-col-resize"
      )}
      title="Drag to resize sidebar freely (Double-click or press Home to reset)"
    >
      {/* Center visual divider line */}
      <div
        className={clsx(
          "w-0.5 h-full mx-auto transition-colors duration-150",
          isResizing
            ? "bg-indigo-500 w-1"
            : "bg-transparent group-hover:bg-slate-300 group-focus-visible:bg-indigo-500"
        )}
      />
    </div>
  );
};
