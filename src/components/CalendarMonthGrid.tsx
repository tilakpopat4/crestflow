import React from 'react';
import {
  CalendarCell,
  YearMonth,
  monthName,
  weeksOf,
  weekdayOrder
} from '../lib/calendarUtils';

export interface CellRenderInfo {
  selected?: string;
  range?: 'single' | 'start' | 'end' | 'middle' | 'preview';
  edge?: string;
  label: string;
  current?: string;
  disabled?: string;
  tab: string;
  text: string;
}

interface CalendarMonthGridProps {
  id: string;
  view: YearMonth;
  onGridKey: (event: React.KeyboardEvent) => void;
  cellInfo: (cell: CalendarCell) => CellRenderInfo;
  onPickDay: (day: number) => void;
  onFocusDay: (day: number) => void;
  onHoverDay: (event: React.PointerEvent, day: number, disabled?: string) => void;
  className?: string;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  id,
  view,
  onGridKey,
  cellInfo,
  onPickDay,
  onFocusDay,
  onHoverDay,
  className = ''
}) => {
  const weeks = weeksOf(view);
  const weekdays = weekdayOrder();

  return (
    <div className={`min-w-0 flex-1 ${className}`}>
      <table
        id={id}
        onKeyDown={onGridKey}
        role="grid"
        aria-labelledby={`${id}-caption`}
        className="w-full table-fixed border-collapse select-none"
      >
        <caption
          id={`${id}-caption`}
          className="pb-2 text-sm/9 font-medium text-slate-900 dark:text-slate-100"
        >
          {monthName(view)}
        </caption>
        <thead>
          <tr>
            {weekdays.map((name) => (
              <th
                key={name}
                scope="col"
                abbr={name}
                className="h-8 text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                {name.slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w} hidden={week.every((c) => !c.inMonth) ? true : undefined}>
              {week.map((c) => {
                const a = cellInfo(c);
                if (!c.inMonth) {
                  return <td key={c.day} className="p-0" />;
                }

                return (
                  <td
                    key={c.day}
                    aria-selected={a.selected}
                    data-range={a.range}
                    data-edge={a.edge}
                    className="group p-0 first:rounded-l-lg last:rounded-r-lg aria-selected:bg-slate-100 data-[range=end]:rounded-r-lg data-[range=preview]:bg-slate-100 data-[range=single]:rounded-lg data-[range=start]:rounded-l-lg dark:aria-selected:bg-slate-800 dark:data-[range=preview]:bg-slate-800"
                  >
                    <button
                      type="button"
                      tabIndex={Number(a.tab)}
                      aria-label={a.label}
                      aria-current={a.current as any}
                      aria-disabled={a.disabled}
                      onClick={() => !a.disabled && onPickDay(c.day)}
                      onFocus={() => onFocusDay(c.day)}
                      onPointerEnter={(e) => onHoverDay(e, c.day, a.disabled)}
                      className="relative flex h-9 sm:h-10 w-full cursor-pointer items-center justify-center rounded-lg text-xs sm:text-sm text-slate-900 tabular-nums transition-[background-color] duration-120 group-data-edge:bg-slate-900 group-data-edge:text-white hover:bg-slate-100 group-data-edge:hover:bg-slate-800 group-data-[range=middle]:hover:bg-slate-200 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400 aria-disabled:hover:bg-transparent aria-[current=date]:font-semibold aria-[current=date]:after:absolute aria-[current=date]:after:bottom-1.5 aria-[current=date]:after:left-1/2 aria-[current=date]:after:size-1 aria-[current=date]:after:-translate-x-1/2 aria-[current=date]:after:rounded-full aria-[current=date]:after:bg-current motion-reduce:transition-none dark:text-slate-100 dark:group-data-edge:bg-slate-100 dark:group-data-edge:text-slate-950 dark:hover:bg-slate-800 dark:group-data-edge:hover:bg-slate-200 dark:group-data-[range=middle]:hover:bg-slate-700 dark:focus-visible:outline-slate-100 dark:aria-disabled:text-slate-600 dark:aria-disabled:hover:bg-transparent"
                    >
                      {a.text}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
