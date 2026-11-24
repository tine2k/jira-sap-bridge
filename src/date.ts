export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const instant = new Date(Date.UTC(year, month - 1, day));

  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function validateCalendarDate(value: string): void {
  if (parseCalendarDate(value) === null) {
    throw new Error(`"${value}" is not a valid YYYY-MM-DD calendar date`);
  }
}

/**
 * Formats a configured calendar date for the OData payload. The value never
 * goes through a local Date instant, so the calendar day cannot drift.
 */
export function formatEntryDate(value: string): string {
  validateCalendarDate(value);
  return `${value}T00:00:00`;
}

/** Inclusive list of calendar dates between two YYYY-MM-DD values. */
export function enumerateDates(from: string, to: string, maxDays = 366): string[] {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  if (start === null || end === null) {
    throw new Error(`Invalid date range: "${from}" to "${to}"`);
  }

  const startMs = Date.UTC(start.year, start.month - 1, start.day);
  const endMs = Date.UTC(end.year, end.month - 1, end.day);
  if (endMs < startMs) {
    throw new Error(`Date range ends before it starts: "${from}" to "${to}"`);
  }

  const dates: string[] = [];
  for (let ms = startMs; ms <= endMs; ms += 86_400_000) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
    if (dates.length > maxDays) {
      throw new Error(`Date range exceeds ${maxDays} days`);
    }
  }
  return dates;
}

/** Normalizes an OData v2 date value (`/Date(ms)/` or ISO) to YYYY-MM-DD. */
export function parseODataDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const ticks = /^\/Date\((-?\d+)\)\/$/.exec(value);
  if (ticks !== null) {
    return new Date(Number(ticks[1])).toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return null;
}
