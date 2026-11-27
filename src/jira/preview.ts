import { parseCalendarDate } from "../date.ts";
import { aggregateDays, type DayEntry } from "./aggregate.ts";
import { parsePeriod } from "./fields.ts";
import { firstNameFromName } from "./filename.ts";
import type { RawRow, RowWarning } from "./types.ts";
import type { MonthRange } from "../import/month.ts";

export type PreviewWarningKind =
  | "row"
  | "outside-month"
  | "weekend"
  | "long-day"
  | "invalid-day"
  | "name-mismatch"
  | "period-mismatch"
  | "truncated-note";

export interface PreviewWarning {
  kind: PreviewWarningKind;
  message: string;
  /** Calendar day the warning belongs to, when applicable. */
  date?: string;
}

export interface Preview {
  range: MonthRange;
  person: string;
  firstName: string;
  days: DayEntry[];
  totalMinutes: number;
  totalHours: string;
  entryCount: number;
  warnings: PreviewWarning[];
}

export interface PreviewInput {
  range: MonthRange;
  /** Name parsed from the export filename. */
  filenameName: string;
  rows: RawRow[];
  rowWarnings?: RowWarning[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function weekdayIndex(date: string): number | null {
  const parsed = parseCalendarDate(date);
  if (parsed === null) {
    return null;
  }
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
}

export function isWeekend(date: string): boolean {
  const day = weekdayIndex(date);
  return day === 0 || day === 6;
}

/** `2026-11-02` -> `Mon 02 Nov`. */
export function formatDayLabel(date: string): string {
  const parsed = parseCalendarDate(date);
  if (parsed === null) {
    return date;
  }
  const weekday = WEEKDAYS[weekdayIndex(date) ?? 0] ?? "";
  const month = MONTHS[parsed.month - 1] ?? "";
  return `${weekday} ${String(parsed.day).padStart(2, "0")} ${month.slice(0, 3)}`;
}

/** `{ year: 2026, month: 11 }` -> `November 2026`. */
export function formatMonthLabel(range: { year: number; month: number }): string {
  return `${MONTHS[range.month - 1] ?? "Month"} ${range.year}`;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatHoursFromMinutes(minutes: number): string {
  return String(Math.round((minutes / 60) * 100) / 100);
}

/**
 * Builds the reviewable preview. Rows outside the selected month are excluded
 * from the totals but kept as warnings; everything that looks unusual is
 * surfaced instead of silently corrected.
 */
export function buildPreview(input: PreviewInput): Preview {
  const { range, filenameName, rows, rowWarnings = [] } = input;
  const warnings: PreviewWarning[] = rowWarnings.map((warning) => ({
    kind: "row",
    message: `Line ${warning.line}: ${warning.message}`,
  }));

  const inMonth: RawRow[] = [];
  for (const row of rows) {
    if (row.outsideSelectedMonth) {
      warnings.push({
        kind: "outside-month",
        date: row.workDate,
        message: `${row.issueKey} on ${row.workDate} is outside ${range.from} to ${range.to} and was excluded.`,
      });
    } else {
      inMonth.push(row);
    }
  }

  const days = aggregateDays(inMonth);
  let totalMinutes = 0;
  for (const row of inMonth) {
    totalMinutes += row.minutes;
  }

  for (const day of days) {
    if (isWeekend(day.date)) {
      warnings.push({
        kind: "weekend",
        date: day.date,
        message: `${formatDayLabel(day.date)} (${day.date}) is a weekend entry.`,
      });
    }
    if (day.minutes > 24 * 60) {
      warnings.push({
        kind: "invalid-day",
        date: day.date,
        message: `${day.date} totals ${day.hours} h, which exceeds 24 h and cannot be a single SAP entry.`,
      });
    } else if (day.minutes > 8 * 60) {
      warnings.push({
        kind: "long-day",
        date: day.date,
        message: `${day.date} totals ${day.hours} h, above a normal 8 h day.`,
      });
    }
    if (day.truncatedKeys.length > 0) {
      warnings.push({
        kind: "truncated-note",
        date: day.date,
        message: `${day.date} note was truncated; omitted issue keys: ${day.truncatedKeys.join(", ")}.`,
      });
    }
  }

  const csvNames = new Set(rows.map((row) => row.fullName.trim()).filter(Boolean));
  const normalizedFilename = normalizeName(filenameName);
  const differingNames = [...csvNames].filter((name) => normalizeName(name) !== normalizedFilename);
  if (differingNames.length > 0) {
    warnings.push({
      kind: "name-mismatch",
      message: `Filename says "${filenameName}" but the export says "${differingNames.join('", "')}".`,
    });
  }

  const periods = new Set(rows.map((row) => row.period.trim()).filter(Boolean));
  for (const periodRaw of periods) {
    const period = parsePeriod(periodRaw);
    if (period !== null && (period.year !== range.year || period.month !== range.month)) {
      warnings.push({
        kind: "period-mismatch",
        message: `Export Period ${periodRaw} does not match ${formatMonthLabel(range)}.`,
      });
    }
  }

  return {
    range,
    person: filenameName,
    firstName: firstNameFromName(filenameName),
    days,
    totalMinutes,
    totalHours: formatHoursFromMinutes(totalMinutes),
    entryCount: inMonth.length,
    warnings,
  };
}
