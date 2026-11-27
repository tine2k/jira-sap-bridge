import { parseCalendarDate } from "../date.ts";

export interface SelectedMonth {
  year: number;
  /** 1-12 */
  month: number;
}

export type WorkDateParse =
  | { ok: true; date: string; outsideSelectedMonth: boolean }
  | { ok: false; error: string };

export type HoursParse = { ok: true; minutes: number } | { ok: false; error: string };

const WORK_DATE_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildDate(year: number, month: number, day: number): string | null {
  const value = `${year}-${pad2(month)}-${pad2(day)}`;
  return parseCalendarDate(value) === null ? null : value;
}

/** Parses the export's `Period` column (`1126` -> November 2026). */
export function parsePeriod(raw: string): SelectedMonth | null {
  const match = /^(\d{2})(\d{2})$/.exec(raw.trim());
  if (match === null) {
    return null;
  }
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

/**
 * The export writes `M/D/YY H:mm`. Because month-first and day-first can both
 * look valid, the selected month and `Period` choose the reading. A date that
 * resolves but falls outside the selected month is returned with a flag so the
 * preview can warn and exclude it.
 */
export function parseWorkDate(
  raw: string,
  selected: SelectedMonth,
  periodRaw = "",
): WorkDateParse {
  const match = WORK_DATE_PATTERN.exec(raw.trim());
  if (match === null) {
    return { ok: false, error: `Work date "${raw}" is not in M/D/YY format.` };
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const yearRaw = match[3] ?? "";
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);

  const hourRaw = match[4];
  if (hourRaw !== undefined) {
    const hour = Number(hourRaw);
    const minute = Number(match[5]);
    if (hour > 23 || minute > 59) {
      return { ok: false, error: `Work date "${raw}" has an invalid time.` };
    }
  }

  const candidates: string[] = [];
  const monthFirst = buildDate(year, first, second);
  if (monthFirst !== null) {
    candidates.push(monthFirst);
  }
  const dayFirst = buildDate(year, second, first);
  if (dayFirst !== null && !candidates.includes(dayFirst)) {
    candidates.push(dayFirst);
  }

  if (candidates.length === 0) {
    return { ok: false, error: `Work date "${raw}" is not a real calendar date.` };
  }

  const selectedPrefix = `${selected.year}-${pad2(selected.month)}-`;
  const inSelectedMonth = candidates.find((date) => date.startsWith(selectedPrefix));
  if (inSelectedMonth !== undefined) {
    return { ok: true, date: inSelectedMonth, outsideSelectedMonth: false };
  }

  const period = parsePeriod(periodRaw);
  if (period !== null) {
    const periodPrefix = `${period.year}-${pad2(period.month)}-`;
    const inPeriod = candidates.find((date) => date.startsWith(periodPrefix));
    if (inPeriod !== undefined) {
      return { ok: true, date: inPeriod, outsideSelectedMonth: true };
    }
  }

  const fallback = candidates[0];
  if (fallback === undefined) {
    return { ok: false, error: `Work date "${raw}" could not be resolved.` };
  }
  return { ok: true, date: fallback, outsideSelectedMonth: true };
}

/** Parses decimal hours into whole minutes so sums cannot drift. */
export function parseHours(raw: string): HoursParse {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    return { ok: false, error: `Hours "${raw}" is not a decimal number.` };
  }
  const minutes = Math.round(Number(normalized) * 60);
  if (!(minutes > 0)) {
    return { ok: false, error: `Hours "${raw}" must be greater than zero.` };
  }
  return { ok: true, minutes };
}
