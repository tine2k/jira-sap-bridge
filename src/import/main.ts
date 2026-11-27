import "dotenv/config";
import * as p from "@clack/prompts";
import { pathToFileURL } from "node:url";
import { ExportParseError, readExport } from "../jira/csv.ts";
import { buildPreview, formatMonthLabel } from "../jira/preview.ts";
import { resolveExportDir } from "./config.ts";
import { ExportDiscoveryError, listExports, type DiscoveredExport } from "./discover.ts";
import { monthRange, pickDefaultMonth, type CalendarDay, type YearMonth } from "./month.ts";
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

export type Ui = Pick<typeof p, "intro" | "outro" | "cancel" | "select" | "isCancel" | "spinner" | "log">;

async function chooseExport(
  offered: ReadonlyArray<DiscoveredExport>,
  today: CalendarDay,
  ui: Ui,
): Promise<DiscoveredExport | null> {
  const preferred = pickDefaultMonth(offered.map(yearMonthOf), today);
  const initial =
    offered.find(
      (file) => preferred !== null && monthValue(yearMonthOf(file)) === monthValue(preferred),
    ) ?? offered[0];
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
  ui.outro("Preview only. Nothing was sent to SAP.");
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
