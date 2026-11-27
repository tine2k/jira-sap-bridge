import Table from "cli-table3";
import pc from "picocolors";
import { parseCalendarDate } from "../date.ts";
import type { DayEntry } from "../jira/aggregate.ts";
import {
  formatDayLabel,
  formatMonthLabel,
  isWeekend,
  LONG_DAY_MINUTES,
  type Preview,
} from "../jira/preview.ts";

export interface RenderSummaryOptions {
  /** Force color on or off; defaults to following the terminal. */
  color?: boolean;
  /** Table width in columns; defaults to the terminal width, or 80 when unknown. */
  width?: number;
}

const FIXED_COLUMN_WIDTHS = [16, 8, 7];
const MIN_DESCRIPTION_WIDTH = 30;
const FALLBACK_WIDTH = 80;
/** cli-table3 draws one vertical border per column plus one on the outer edge. */
const TABLE_BORDER_WIDTH = 5;
const CELL_PADDING = 2;
const DAY_MS = 86_400_000;

interface IsoWeek {
  year: number;
  week: number;
}

/** Returns the ISO 8601 week-year and week number for a calendar date. */
function isoWeek(date: string): IsoWeek | null {
  const parsed = parseCalendarDate(date);
  if (parsed === null) {
    return null;
  }

  const thursday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  const weekday = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday);

  const year = thursday.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year, week };
}

function sameIsoWeek(left: IsoWeek, right: IsoWeek): boolean {
  return left.year === right.year && left.week === right.week;
}

function descriptionWidth(longest: number, tableWidth: number): number {
  const fixed = FIXED_COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0);
  const available = tableWidth - fixed - TABLE_BORDER_WIDTH;
  return Math.max(
    Math.min(longest + CELL_PADDING, available),
    Math.min(longest + CELL_PADDING, MIN_DESCRIPTION_WIDTH),
  );
}

type Colors = ReturnType<typeof pc.createColors>;

function dayColor(colors: Colors, day: DayEntry): (value: string) => string {
  if (day.minutes > 24 * 60) {
    return colors.red;
  }
  if (day.minutes > LONG_DAY_MINUTES) {
    return colors.yellow;
  }
  if (isWeekend(day.date)) {
    return colors.magenta;
  }
  return colors.green;
}

/** Keeps the cell padding intact while wrapping only the visible text in color. */
function colorCell(cell: string, color: (value: string) => string): string {
  const match = /^(\s*)(.*?)(\s*)$/.exec(cell);
  if (match === null) {
    return cell;
  }
  const leading = match[1] ?? "";
  const body = match[2] ?? "";
  const trailing = match[3] ?? "";
  return `${leading}${body.length > 0 ? color(body) : body}${trailing}`;
}

/** A spanning cell's drawable width includes the internal borders it replaces. */
function weekMarkerContent(week: number, colWidths: number[], colors: Colors): string {
  const contentWidth =
    colWidths.reduce((sum, width) => sum + width, 0) + colWidths.length - 1 - CELL_PADDING;
  const title = `Week ${week}`;
  const remaining = Math.max(0, contentWidth - title.length);
  return `${colors.bold(colors.cyan(title))}${" ".repeat(remaining)}`;
}

export function renderSummary(preview: Preview, options: RenderSummaryOptions = {}): string {
  const colors = pc.createColors(options.color ?? Boolean(process.stdout.isTTY));
  const dayCount = preview.days.length;
  const dayWord = dayCount === 1 ? "day" : "days";

  const header = [
    `${colors.bold(`\u{1F5D3}  ${formatMonthLabel(preview.range)}`)}  ${colors.dim(
      `${preview.range.from} - ${preview.range.to}`,
    )}`,
    `${colors.cyan(`Hi ${preview.firstName} \u{1F44B}`)}  ${colors.dim(
      `(${preview.person})`,
    )}  \u00B7  ${preview.entryCount} entries across ${dayCount} ${dayWord}  \u00B7  ${colors.bold(
      `${preview.totalHours} h total`,
    )}`,
  ];

  const totalNote = `${dayCount} ${dayWord} with entries`;
  const longestDescription = Math.max(
    "Description".length,
    totalNote.length,
    ...preview.days.map((day) => day.note.length),
  );
  const tableWidth =
    options.width ??
    (typeof process.stdout.columns === "number" ? process.stdout.columns : FALLBACK_WIDTH);

  const colWidths = [...FIXED_COLUMN_WIDTHS, descriptionWidth(longestDescription, tableWidth)];
  const table = new Table({
    head: ["Day", "Hours", "Items", "Description"],
    colWidths,
    wordWrap: true,
    style: { head: [], border: [] },
  });

  let previousWeek: IsoWeek | null = null;
  for (const day of preview.days) {
    const week = isoWeek(day.date);
    if (week !== null && (previousWeek === null || !sameIsoWeek(previousWeek, week))) {
      table.push([
        {
          colSpan: 4,
          content: weekMarkerContent(week.week, colWidths, colors),
          wordWrap: false,
        },
      ]);
    }

    table.push([formatDayLabel(day.date), `${day.hours} h`, String(day.entryCount), day.note]);
    previousWeek = week;
  }
  table.push(["TOTAL", `${preview.totalHours} h`, String(preview.entryCount), totalNote]);

  const daysByLabel = new Map(preview.days.map((day) => [formatDayLabel(day.date), day]));
  const tableLines = table
    .toString()
    .split("\n")
    .map((line) => {
      if (line.includes("Items") && line.includes("Description")) {
        return colors.bold(line);
      }
      if (line.includes("TOTAL")) {
        return colors.bold(line);
      }

      const cells = line.split("\u2502");
      if (cells.length < 5) {
        return line;
      }

      const label = (cells[1] ?? "").trim();
      const day = daysByLabel.get(label);
      if (day === undefined) {
        return line;
      }

      const color = dayColor(colors, day);
      cells[1] = colorCell(cells[1] ?? "", color);
      cells[2] = colorCell(cells[2] ?? "", color);
      return cells.join("\u2502");
    });

  const body =
    preview.days.length === 0
      ? [
          colors.yellow(
            `No worked hours were found for ${formatMonthLabel(preview.range)} in this export.`,
          ),
        ]
      : tableLines;

  const warningLines: string[] = [];
  if (preview.warnings.length > 0) {
    warningLines.push("", colors.yellow(colors.bold("\u26A0\uFE0F  Warnings")));
    for (const warning of preview.warnings) {
      warningLines.push(`  ${colors.yellow("\u2022")} ${warning.message}`);
    }
  }

  return [...header, "", ...body, ...warningLines].join("\n");
}
