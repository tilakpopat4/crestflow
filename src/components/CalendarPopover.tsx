import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CalendarCell,
  YearMonth,
  fromDay,
  toDay,
  longDate,
  nextMonth,
  monthOf,
  monthIndex,
  keyTarget,
  dayMonthYear,
  getTodayNumber,
  parseDate,
  getStandardPresets,
  plural
} from '../lib/calendarUtils';
import { CalendarMonthGrid, CellRenderInfo } from './CalendarMonthGrid';

interface CalendarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dayNumber: number) => void;
  selectedDay?: number | null;
  triggerRef: React.RefObject<HTMLElement | null>;
  allowFuture?: boolean;
  title?: string;
}

export const CalendarPopover: React.FC<CalendarPopoverProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  selectedDay,
  triggerRef,
  allowFuture = true,
  title = 'Select Date'
}) => {
  const TODAY = getTodayNumber();
  const initialDay = selectedDay || TODAY;
  const [focusDay, setFocusDay] = useState<number>(initialDay);
  const [view, setView] = useState<YearMonth>(() => monthOf(initialDay));
  const [textInput, setTextInput] = useState<string>(() => dayMonthYear(initialDay));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(false);
  const presets = getStandardPresets(TODAY);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const day = selectedDay || TODAY;
      setFocusDay(day);
      setView(monthOf(day));
      setTextInput(dayMonthYear(day));
      setErrorMsg(null);
      wantFocus.current = true;
    }
  }, [isOpen, selectedDay, TODAY]);

  // Focus trap and positioning
  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const el = dialogRef.current;
      const trigger = triggerRef.current;
      if (!el || !trigger) return;
      const phone = window.matchMedia('(max-width: 639px)').matches;
      el.removeAttribute('data-side');
      document.documentElement.classList.toggle('overflow-hidden', phone);
      if (phone) return;

      const box = trigger.getBoundingClientRect();
      const below = window.innerHeight - box.bottom;
      if (el.offsetHeight + 12 > below && box.top > below) {
        el.setAttribute('data-side', 'top');
      }
    };

    place();
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, [isOpen, triggerRef]);

  // Handle outside click & Esc
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Cell renderer
  const getCellInfo = (c: CalendarCell): CellRenderInfo => {
    const isFuture = !allowFuture && c.day > TODAY;
    const isSelected = selectedDay === c.day;
    const isToday = c.day === TODAY;

    return {
      selected: isSelected ? 'true' : undefined,
      range: isSelected ? 'single' : undefined,
      edge: isSelected ? '' : undefined,
      label: `${longDate(c.day)}${isSelected ? ', selected' : ''}${isFuture ? ', future date' : ''}`,
      current: c.inMonth && isToday ? 'date' : undefined,
      disabled: c.inMonth && isFuture ? 'true' : undefined,
      tab: c.inMonth && c.day === focusDay ? '0' : '-1',
      text: c.inMonth ? String(fromDay(c.day).d) : ''
    };
  };

  const handlePick = (day: number) => {
    setFocusDay(day);
    setTextInput(dayMonthYear(day));
    setErrorMsg(null);
    onSelectDate(day);
    onClose();
  };

  const handleGridKey = (e: React.KeyboardEvent) => {
    const target = keyTarget(focusDay, e);
    if (target === null) return;
    e.preventDefault();
    setFocusDay(target);
    setView(monthOf(target));
  };

  const handleManualSubmit = () => {
    const parsed = parseDate(textInput, TODAY);
    if (parsed === null) {
      setErrorMsg('Enter date like 27/10/2026 or 27 Oct.');
      return;
    }
    if (!allowFuture && parsed > TODAY) {
      setErrorMsg('Future dates are not permitted.');
      return;
    }
    handlePick(parsed);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-900/40 sm:hidden transition-opacity duration-120"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-800 max-h-[90dvh] overflow-y-auto sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:right-0 sm:mt-1.5 sm:w-80 sm:rounded-xl sm:shadow-lg sm:data-[side=top]:top-auto sm:data-[side=top]:bottom-full sm:data-[side=top]:mt-0 sm:data-[side=top]:mb-1.5 transition-all duration-120 p-3 sm:p-4"
      >
        {/* Header bar on mobile */}
        <div className="flex items-center justify-between pb-2 sm:hidden border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Quick Presets Strip */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 sm:pb-3 [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => handlePick(presets.today[0])}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handlePick(presets.yesterday[0])}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 transition-colors"
          >
            Yesterday
          </button>
          {allowFuture && (
            <button
              type="button"
              onClick={() => handlePick(TODAY + 1)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 transition-colors"
            >
              Tomorrow
            </button>
          )}
        </div>

        {/* Month Navigation & Grid */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={() => setView(nextMonth(view, -1))}
              aria-label="Previous month"
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors"
            >
              ‹
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {fromDay(focusDay).y}
            </span>
            <button
              type="button"
              onClick={() => setView(nextMonth(view, 1))}
              aria-label="Next month"
              disabled={!allowFuture && monthIndex(view) >= monthIndex(monthOf(TODAY))}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
          </div>

          <CalendarMonthGrid
            id="cal-popover-grid"
            view={view}
            onGridKey={handleGridKey}
            cellInfo={getCellInfo}
            onPickDay={handlePick}
            onFocusDay={setFocusDay}
            onHoverDay={() => {}}
          />
        </div>

        {/* Manual Date Input & Apply Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualSubmit();
                }
              }}
              placeholder="DD/MM/YYYY"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
            />
            <button
              type="button"
              onClick={handleManualSubmit}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shrink-0 cursor-pointer"
            >
              Apply
            </button>
          </div>
          {errorMsg ? (
            <p className="text-[11px] text-red-600 dark:text-red-400">{errorMsg}</p>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Selected: {dayMonthYear(focusDay)}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
