export interface CalendarDay {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
}

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

export interface MonthRange extends YearMonth {
  /** First calendar day, YYYY-MM-DD. */
  from: string;
  /** Last calendar day, YYYY-MM-DD. */
  to: string;
}

export const DEFAULT_MONTH_CUTOFF_DAY = 10;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Month must be an integer between 1 and 12, received "${month}"`);
  }
}

export function previousMonth({ year, month }: YearMonth): YearMonth {
  assertMonth(month);
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/**
 * Days 1-10 default to the previous (finished) month; later days default to
 * the current month. The caller supplies "today" so the result is testable.
 */
export function defaultMonth(
  today: CalendarDay,
  cutoffDay: number = DEFAULT_MONTH_CUTOFF_DAY,
): YearMonth {
  assertMonth(today.month);
  if (!Number.isInteger(today.day) || today.day < 1 || today.day > 31) {
    throw new RangeError(`Day must be an integer between 1 and 31, received "${today.day}"`);
  }
  if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 31) {
    throw new RangeError(`Cutoff day must be an integer between 1 and 31, received "${cutoffDay}"`);
  }

  return today.day <= cutoffDay
    ? previousMonth(today)
    : { year: today.year, month: today.month };
}

/**
 * Picks the default among months that have an export: the date-based default
 * when it is offered, otherwise the newest offered month. Returns null when
 * nothing is offered. `offered` is expected newest first.
 */
export function pickDefaultMonth(
  offered: ReadonlyArray<YearMonth>,
  today: CalendarDay,
): YearMonth | null {
  const preferred = defaultMonth(today);
  const match = offered.find(
    (month) => month.year === preferred.year && month.month === preferred.month,
  );
  return match ?? offered[0] ?? null;
}

/** First and last calendar day of a month, as YYYY-MM-DD strings. */
export function monthRange(year: number, month: number): MonthRange {
  assertMonth(month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    year,
    month,
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}
