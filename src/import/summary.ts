import Table from "cli-table3";
import pc from "picocolors";
import type { DayEntry } from "../jira/aggregate.js";
import {
  formatDayLabel,
  formatMonthLabel,
  isWeekend,
  type Preview,
} from "../jira/preview.js";

export interface RenderSummaryOptions {
  /** Force color on or off; defaults to following the terminal. */
  color?: boolean;
}

type Colors = ReturnType<typeof pc.createColors>;

function dayColor(colors: Colors, day: DayEntry): (value: string) => string {
  if (day.minutes > 24 * 60) {
    return colors.red;
  }
  if (day.minutes > 8 * 60) {
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

  const table = new Table({
    head: ["Day", "Hours", "Items", "Description"],
    colWidths: [16, 8, 7, 60],
    wordWrap: true,
    style: { head: [], border: [] },
  });

  for (const day of preview.days) {
    table.push([formatDayLabel(day.date), `${day.hours} h`, String(day.entryCount), day.note]);
  }
  table.push([
    "TOTAL",
    `${preview.totalHours} h`,
    String(preview.entryCount),
    `${dayCount} ${dayWord} with entries`,
  ]);

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
