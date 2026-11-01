import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CalendarCell,
  YearMonth,
  fromDay,
  longDate,
  nextMonth,
  monthOf,
  monthIndex,
  keyTarget,
  dayMonthYear,
  rangeText,
  isoDate,
  getTodayNumber,
  getStandardPresets,
  plural
} from '../lib/calendarUtils';
import { CalendarMonthGrid, CellRenderInfo } from './CalendarMonthGrid';
import { DateRangePresets } from './DateRangePresets';

export interface DateRange {
  start: number; // day number
  end: number;   // day number
}

interface DateRangePickerProps {
  initialRange?: DateRange;
  onApplyRange?: (range: { startIso: string; endIso: string; startDay: number; endDay: number }) => void;
  className?: string;
  allowFuture?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  initialRange,
  onApplyRange,
  className = '',
  allowFuture = false
}) => {
  const TODAY = getTodayNumber();
  const presets = getStandardPresets(TODAY);
  const defaultRange: DateRange = initialRange || {
    start: presets.month[0],
    end: presets.month[1]
  };

  const [applied, setApplied] = useState<DateRange>(defaultRange);
  const [s, setS] = useState<{
    start: number;
    end: number | null;
    hover: number | null;
    focus: number;
  }>({
    start: defaultRange.start,
    end: defaultRange.end,
    hover: null,
    focus: defaultRange.end
  });

  const [view, setView] = useState<YearMonth>(() => monthOf(defaultRange.end));
  const [isOpen, setOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const activePreset = s.end !== null
    ? Object.keys(presets).find((k) => presets[k][0] === s.start && presets[k][1] === s.end) || ''
    : '';

  // Responsive placement
  useLayoutEffect(() => {
    const place = () => {
      const el = dialogRef.current;
      const wrap = wrapRef.current;
      if (!el || !wrap) return;
      const phone = window.matchMedia('(max-width: 639px)').matches;
      el.removeAttribute('data-side');
      document.documentElement.classList.toggle('overflow-hidden', isOpen && phone);
      if (!isOpen || phone) return;
      const box = wrap.getBoundingClientRect();
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
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const rangeInfo = (c: CalendarCell): CellRenderInfo => {
    const future = !allowFuture && c.day > TODAY;
    const done = s.end !== null;
    const lo = done ? s.start : Math.min(s.start, s.hover === null ? s.start : s.hover);
    const hi = done ? s.end : Math.max(s.start, s.hover === null ? s.start : s.hover);

    const getRangeState = () => {
      if (!c.inMonth || c.day < lo || c.day > hi) return undefined;
      if (!done) return c.day === s.start ? 'single' : 'preview';
      if (lo === hi) return 'single';
      if (c.day === lo) return 'start';
      return c.day === hi ? 'end' : 'middle';
    };

    return {
      selected: c.inMonth ? String(done ? c.day >= s.start && c.day <= s.end : c.day === s.start) : undefined,
      range: getRangeState(),
      edge: ['start', 'end', 'single'].includes(getRangeState() || '') ? '' : undefined,
      label: `${longDate(c.day)}${done && c.day === s.end ? ', end date' : ''}${future ? ', future date' : ''}`,
      current: c.inMonth && c.day === TODAY ? 'date' : undefined,
      disabled: c.inMonth && future ? 'true' : undefined,
      tab: c.inMonth && c.day === s.focus ? '0' : '-1',
      text: c.inMonth ? String(fromDay(c.day).d) : ''
    };
  };

  const pickDay = (day: number) => {
    if (s.end !== null) {
      setS({ start: day, end: null, hover: null, focus: day });
    } else {
      const start = day < s.start ? day : s.start;
      const end = day < s.start ? s.start : day;
      setS({ start, end, hover: null, focus: day });
    }
  };

  const choosePreset = (key: string) => {
    const [pStart, pEnd] = presets[key];
    setS({ start: pStart, end: pEnd, hover: null, focus: pEnd });
    setView(monthOf(pEnd));
  };

  const handleApply = () => {
    if (s.end === null) return;
    const finalRange = { start: s.start, end: s.end };
    setApplied(finalRange);
    setOpen(false);
    if (onApplyRange) {
      onApplyRange({
        startIso: isoDate(finalRange.start),
        endIso: isoDate(finalRange.end),
        startDay: finalRange.start,
        endDay: finalRange.end
      });
    }
  };

  return (
    <div ref={wrapRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
      >
        <span className="text-slate-500">📅</span>
        <span>{rangeText(applied.start, applied.end)}</span>
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {/* Popover / Mobile Scrim */}
      {isOpen && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 sm:hidden"
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-800 max-h-[90dvh] overflow-y-auto sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:right-0 sm:mt-1.5 sm:w-116 lg:w-176 sm:rounded-xl sm:shadow-lg sm:data-[side=top]:top-auto sm:data-[side=top]:bottom-full sm:data-[side=top]:mt-0 sm:data-[side=top]:mb-1.5 transition-all duration-120"
          >
            <div className="pt-3 sm:flex sm:pt-0">
              <DateRangePresets activePreset={activePreset} onSelectPreset={choosePreset} />

              {/* Month Grids (1 on mobile, 2 on desktop) */}
              <div className="relative min-w-0 grow px-3 pt-2 sm:p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setView(nextMonth(view, -1))}
                    aria-label="Previous month"
                    className="size-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setView(nextMonth(view, 1))}
                    aria-label="Next month"
                    disabled={!allowFuture && monthIndex(view) >= monthIndex(monthOf(TODAY))}
                    className="size-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>

                <div className="flex gap-4">
                  {/* Previous month on large screens */}
                  <div className="hidden lg:block min-w-0 flex-1">
                    <CalendarMonthGrid
                      id="drp-before"
                      view={nextMonth(view, -1)}
                      onGridKey={(e) => {
                        const target = keyTarget(s.focus, e);
                        if (target !== null) {
                          e.preventDefault();
                          setS({ ...s, focus: target });
                          setView(monthOf(target));
                        }
                      }}
                      cellInfo={rangeInfo}
                      onPickDay={pickDay}
                      onFocusDay={(d) => setS({ ...s, focus: d })}
                      onHoverDay={(e, d) => s.end === null && setS({ ...s, hover: d })}
                    />
                  </div>

                  {/* Primary month */}
                  <CalendarMonthGrid
                    id="drp-current"
                    view={view}
                    onGridKey={(e) => {
                      const target = keyTarget(s.focus, e);
                      if (target !== null) {
                        e.preventDefault();
                        setS({ ...s, focus: target });
                        setView(monthOf(target));
                      }
                    }}
                    cellInfo={rangeInfo}
                    onPickDay={pickDay}
                    onFocusDay={(d) => setS({ ...s, focus: d })}
                    onHoverDay={(e, d) => s.end === null && setS({ ...s, hover: d })}
                  />
                </div>
              </div>
            </div>

            {/* Footer with summary and Apply */}
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {s.end === null ? 'Pick end date' : plural(s.end - s.start + 1, 'day', 'days')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={s.end === null}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
