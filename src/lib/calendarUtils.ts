/**
 * Pure arithmetic calendar utilities without timezone shifts or clock discrepancies.
 * Days are counted as whole numbers from 1 January 1970 (Unix epoch day 0).
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEK_START = 0; // Monday start

export const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const monthLength = (y: number, m: number): number =>
  [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];

export interface YearMonthDay {
  y: number;
  m: number; // 0-11
  d: number; // 1-31
}

export interface YearMonth {
  y: number;
  m: number; // 0-11
}

/** Converts year, month (0-11), and day to day number since epoch */
export const toDay = (y: number, m: number, d: number): number => {
  const yy = m < 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * ((m + 10) % 12) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
};

/** Converts day number to year, month (0-11), and day */
export const fromDay = (n: number): YearMonthDay => {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const m = mp < 10 ? mp + 2 : mp - 10;
  return { y: yoe + era * 400 + (m < 2 ? 1 : 0), m, d: doy - Math.floor((153 * mp + 2) / 5) + 1 };
};

/** 0 is Monday ... 6 is Sunday (1 Jan 1970 was a Thursday) */
export const weekday = (n: number): number => (((n + 3) % 7) + 7) % 7;

/** Where a day sits in the week (0 to 6) based on WEEK_START */
export const column = (n: number): number => (weekday(n) - WEEK_START + 7) % 7;

export const addMonths = (n: number, k: number): number => {
  const { y, m, d } = fromDay(n);
  const total = y * 12 + m + k;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  return toDay(ny, nm, Math.min(d, monthLength(ny, nm)));
};

export const monthOf = (n: number): YearMonth => {
  const { y, m } = fromDay(n);
  return { y, m };
};

export const nextMonth = (view: YearMonth, k: number): YearMonth => {
  const total = view.y * 12 + view.m + k;
  return { y: Math.floor(total / 12), m: total - Math.floor(total / 12) * 12 };
};

export const sameMonth = (a: YearMonth, b: YearMonth): boolean => a.y === b.y && a.m === b.m;

export interface CalendarCell {
  day: number;
  inMonth: boolean;
}

/** 42 days grid for a month (6 weeks) */
export const monthCells = (view: YearMonth): CalendarCell[] => {
  const first = toDay(view.y, view.m, 1);
  const start = first - column(first);
  const length = monthLength(view.y, view.m);
  return Array.from({ length: 42 }, (_, i) => ({
    day: start + i,
    inMonth: i >= column(first) && i < column(first) + length
  }));
};

export const monthName = (view: YearMonth): string => `${MONTHS[view.m]} ${view.y}`;

export const longDate = (n: number): string => {
  const { y, m, d } = fromDay(n);
  return `${WEEKDAYS[weekday(n)]}, ${d} ${MONTHS[m]} ${y}`;
};

export const shortDate = (n: number): string => {
  const { y, m, d } = fromDay(n);
  return `${WEEKDAYS[weekday(n)].slice(0, 3)}, ${d} ${MONTHS[m].slice(0, 3)} ${y}`;
};

export const dayMonth = (n: number): string => {
  const { m, d } = fromDay(n);
  return `${d} ${MONTHS[m].slice(0, 3)}`;
};

export const dayMonthYear = (n: number): string => `${dayMonth(n)} ${fromDay(n).y}`;

export const rangeText = (a: number, b: number): string => {
  if (a === b) return dayMonthYear(a);
  return fromDay(a).y === fromDay(b).y
    ? `${dayMonth(a)} – ${dayMonthYear(b)}`
    : `${dayMonthYear(a)} – ${dayMonthYear(b)}`;
};

export const monthIndex = (view: YearMonth): number => view.y * 12 + view.m;

export const isoDate = (n: number): string => {
  const { y, m, d } = fromDay(n);
  return `${y}-${m < 9 ? '0' : ''}${m + 1}-${d < 10 ? '0' : ''}${d}`;
};

export const dmyDate = (n: number): string => {
  const { y, m, d } = fromDay(n);
  return `${d < 10 ? '0' : ''}${d}/${m < 9 ? '0' : ''}${m + 1}/${y}`;
};

export const getTodayNumber = (): number => {
  const now = new Date();
  return toDay(now.getFullYear(), now.getMonth(), now.getDate());
};

export const parseDate = (text: string, today: number): number | null => {
  if (!text) return null;
  const s = text
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (s === 'today') return today;
  if (s === 'tomorrow') return today + 1;
  if (s === 'yesterday') return today - 1;

  const year = (t: string) => (t.length === 2 ? 2000 + Number(t) : Number(t));
  const valid = (y: number, m: number, d: number) =>
    m >= 0 && m < 12 && d >= 1 && d <= monthLength(y, m) ? toDay(y, m, d) : null;

  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return valid(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const numeric = s.match(/^(\d{1,2})[\s./-](\d{1,2})(?:[\s./-](\d{4}|\d{2}))?$/);
  if (numeric) {
    return valid(
      numeric[3] ? year(numeric[3]) : fromDay(today).y,
      Number(numeric[2]) - 1,
      Number(numeric[1])
    );
  }

  const word = s.match(/[a-z]{3,}/);
  const numbers = s.match(/\d+/g) || [];
  if (!word || !numbers.length || numbers.length > 2 || s.replace(/[a-z]+|\d+|[\s./-]/g, '')) return null;

  const m = MONTHS.findIndex(
    (name) => name.toLowerCase().startsWith(word[0].slice(0, 3))
  );
  const d = numbers.find((n) => n.length <= 2);
  const y = numbers.find((n) => n !== d);
  if (m < 0 || !d) return null;
  return valid(y ? year(y) : fromDay(today).y, m, Number(d));
};

export const keyTarget = (day: number, event: React.KeyboardEvent): number | null => {
  const step: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7
  };
  if (step[event.key]) return day + step[event.key];
  if (event.key === 'Home') return day - column(day);
  if (event.key === 'End') return day + 6 - column(day);
  if (event.key === 'PageUp') return addMonths(day, event.shiftKey ? -12 : -1);
  if (event.key === 'PageDown') return addMonths(day, event.shiftKey ? 12 : 1);
  return null;
};

export const weeksOf = (view: YearMonth): CalendarCell[][] => {
  const cells = monthCells(view);
  return Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
};

export const weekdayOrder = (): string[] =>
  Array.from({ length: 7 }, (_, i) => WEEKDAYS[(i + WEEK_START) % 7]);

export const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const getStandardPresets = (today: number): Record<string, [number, number]> => {
  const { y, d } = fromDay(today);
  return {
    today: [today, today],
    yesterday: [today - 1, today - 1],
    '7d': [today - 6, today],
    '30d': [today - 29, today],
    month: [today - d + 1, today],
    'last-month': [addMonths(today - d + 1, -1), today - d],
    year: [toDay(y, 0, 1), today]
  };
};
