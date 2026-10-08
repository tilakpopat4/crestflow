/**
 * Date utility functions for Crestflow
 * Handles consistent date formatting, parsing, and timezone safety (using local time and DD/MM/YYYY).
 */

/**
 * Converts a Date object, timestamp, or date string to local 'YYYY-MM-DD' format.
 */
export function formatLocalDateToYMD(dateOrTimestamp?: Date | number | string | null): string {
  if (!dateOrTimestamp) return '';
  
  if (typeof dateOrTimestamp === 'string') {
    const trimmed = dateOrTimestamp.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }

  const d = new Date(dateOrTimestamp);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Converts a 'YYYY-MM-DD' string to a timestamp (milliseconds).
 * Sets time to 12:00:00 (noon) local time to prevent any DST or midnight timezone shifts.
 */
export function parseYMDToTimestamp(ymd?: string | null): number {
  if (!ymd) return Date.now();
  const trimmed = ymd.trim();
  const parts = trimmed.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getTime();
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

/**
 * Converts a 'YYYY-MM-DD' string to 'DD/MM/YYYY'.
 */
export function formatYMDToDMY(ymd?: string | null): string {
  if (!ymd) return '';
  const trimmed = ymd.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y && m && d) {
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  return '';
}

/**
 * Parses any user-typed date representation (e.g. DD/MM/YYYY, DD-MM-YYYY, D/M/YYYY, DD/MM/YY)
 * into a valid 'YYYY-MM-DD' string. Returns null if invalid.
 */
export function parseDMYToYMD(dmy?: string | null): string | null {
  if (!dmy) return null;
  const trimmed = dmy.trim();
  
  // If user passed YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    if (isValidDateParts(y, m, d)) return trimmed;
  }

  // Handle DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?$/);
  if (!match) return null;

  let day = parseInt(match[1], 10);
  let month = parseInt(match[2], 10);
  let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

  // Handle 2-digit years (e.g. 26 -> 2026)
  if (year < 100) {
    year += 2000;
  }

  if (!isValidDateParts(year, month, day)) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Validates whether year, month (1-12), and day (1-31) form a real calendar date.
 */
export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const maxDays = new Date(year, month, 0).getDate();
  return day <= maxDays;
}
