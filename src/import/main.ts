import "dotenv/config";
import * as p from "@clack/prompts";
import { pathToFileURL } from "node:url";
import { ConfigError } from "../config.ts";
import { ExportParseError, readExport } from "../jira/csv.ts";
import { firstNameFromName } from "../jira/filename.ts";
import { buildPreview, formatMonthLabel } from "../jira/preview.ts";
import { BrowserAuthError } from "../sap/browser.ts";
import { SapRequestError, SapTransportError } from "../sap/client.ts";
import { resolveExportDir } from "./config.ts";
import { ExportDiscoveryError, listExports, type DiscoveredExport } from "./discover.ts";
import { monthRange, pickDefaultMonth, type CalendarDay, type YearMonth } from "./month.ts";
import { compareMonth, renderComparison, type SapComparison } from "./sap-compare.ts";
import { renderSummary } from "./summary.ts";

const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_CANCEL = 130;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function monthValue({ year, month }: YearMonth): string {
  return `${year}-${pad2(month)}`;
}

export function todayFromDate(date: Date): CalendarDay {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function yearMonthOf(file: DiscoveredExport): YearMonth {
  return { year: Number(file.from.slice(0, 4)), month: Number(file.from.slice(5, 7)) };
}

export type Ui = Pick<
  typeof p,
  "intro" | "outro" | "cancel" | "select" | "isCancel" | "spinner" | "log" | "confirm"
>;

export interface ImportDependencies {
  /** Replaces the SAP comparison in tests; defaults to the real browser flow. */
  compare?: typeof compareMonth;
}

/** Mirrors the `timesheet` CLI's wording for SAP failures. */
function reportSapError(error: unknown, ui: Ui): void {
  if (error instanceof ConfigError) {
    ui.log.error(`Configuration error: ${error.message}`);
    return;
  }
  if (error instanceof SapRequestError) {
    ui.log.error(error.message);
    if (error.body.length > 0) {
      ui.log.error(
        /^\s*<html/i.test(error.body) ? "SAP returned a login page; the session expired." : error.body,
      );
    }
    return;
  }
  if (error instanceof SapTransportError || error instanceof BrowserAuthError) {
    ui.log.error(error.message);
    return;
  }
  throw error;
}

function defaultExport(
  offered: ReadonlyArray<DiscoveredExport>,
  today: CalendarDay,
): DiscoveredExport | undefined {
  const preferred = pickDefaultMonth(offered.map(yearMonthOf), today);
  return (
    offered.find(
      (file) => preferred !== null && monthValue(yearMonthOf(file)) === monthValue(preferred),
    ) ?? offered[0]
  );
}

async function chooseExport(
  offered: ReadonlyArray<DiscoveredExport>,
  today: CalendarDay,
  ui: Ui,
): Promise<DiscoveredExport | null> {
  const initial = defaultExport(offered, today);
  const selected = await ui.select({
    message: "Which export are you filing?",
    options: offered.map((file) => ({
      value: file.path,
      label: `${formatMonthLabel(yearMonthOf(file))} (${file.filename})`,
    })),
    initialValue: initial?.path,
  });

  if (ui.isCancel(selected)) {
    return null;
  }

  return offered.find((file) => file.path === String(selected)) ?? null;
}

export async function runImport(
  today: CalendarDay,
  directory: string,
  ui: Ui = p,
  write: (text: string) => void = (text) => process.stdout.write(text),
  deps: ImportDependencies = {},
): Promise<number> {
  ui.intro("Jira hours -> SAP preview");

  const offered = await listExports(directory);

  if (offered.length === 0) {
    ui.log.error(`No Jira exports found in ${directory}.`);
    ui.log.info(
      "Download the monthly export from Tempo/Jira and run the import again. " +
        "The file name must look like User_ <Name>_2026-11-01_2026-11-30.csv.",
    );
    ui.outro("Nothing to preview.");
    return EXIT_ERROR;
  }

  const greeted = defaultExport(offered, today);
  if (greeted !== undefined) {
    ui.log.message(`Hi ${firstNameFromName(greeted.name)} \u{1F44B}`);
  }

  const file = await chooseExport(offered, today, ui);
  if (file === null) {
    ui.cancel("Import cancelled.");
    return EXIT_CANCEL;
  }

  const month = yearMonthOf(file);
  const range = monthRange(month.year, month.month);
  const spinner = ui.spinner();
  spinner.start("Reading the export");
  const result = await readExport(file.path, month);
  spinner.stop(`Read ${result.rows.length} entries.`);

  const preview = buildPreview({
    range,
    filenameName: file.name,
    rows: result.rows,
    rowWarnings: result.warnings,
  });

  write(`\n${renderSummary(preview, { color: Boolean(process.stdout.isTTY) })}\n\n`);

  const proceed = await ui.confirm({
    message: "Compare with SAP?",
    initialValue: false,
  });

  if (ui.isCancel(proceed) || proceed !== true) {
    ui.outro("Preview only. Nothing was sent to SAP.");
    return EXIT_OK;
  }

  const compare = deps.compare ?? compareMonth;
  const sapSpinner = ui.spinner();
  sapSpinner.start("Reading SAP");
  let comparison: SapComparison;
  try {
    comparison = await compare(range, {
      hours: preview.totalHours,
      entries: preview.entryCount,
    });
  } catch (error) {
    sapSpinner.stop("SAP read failed.");
    reportSapError(error, ui);
    return EXIT_ERROR;
  }
  sapSpinner.stop(`Read ${comparison.recordedEntries} SAP entries.`);

  write(`${renderComparison(comparison, { color: Boolean(process.stdout.isTTY) })}\n\n`);
  ui.outro("Comparison only. Nothing was written to SAP.");
  return EXIT_OK;
}

export async function main(): Promise<number> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write(
      "npm run import needs an interactive terminal. Run it directly in a terminal, not through a pipe.\n",
    );
    return EXIT_ERROR;
  }

  try {
    return await runImport(todayFromDate(new Date()), resolveExportDir(process.env));
  } catch (error) {
    if (error instanceof ExportDiscoveryError || error instanceof ExportParseError) {
      p.log.error(error.message);
      return EXIT_ERROR;
    }
    p.log.error(`Unexpected error: ${(error as Error).message}`);
    return EXIT_ERROR;
  }
}

const entry = process.argv[1];
const isMain = entry !== undefined && import.meta.url === pathToFileURL(entry).href;

if (isMain) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      process.stderr.write(`Import failed: ${(error as Error).message}\n`);
      process.exitCode = EXIT_ERROR;
    });
}
