import "dotenv/config";
import * as p from "@clack/prompts";
import { pathToFileURL } from "node:url";
import { ExportParseError, readExport } from "../jira/csv.ts";
import { buildPreview, formatMonthLabel } from "../jira/preview.ts";
import { resolveExportDir } from "./config.ts";
import {
  ExportDiscoveryError,
  findExports,
  listExportMonths,
  type DiscoveredExport,
} from "./discover.ts";
import {
  monthRange,
  pickDefaultMonth,
  type CalendarDay,
  type MonthRange,
  type YearMonth,
} from "./month.ts";
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

export function monthOptions(
  offered: ReadonlyArray<MonthRange>,
): Array<{ value: string; label: string; hint: string }> {
  return offered.map((month) => ({
    value: monthValue(month),
    label: formatMonthLabel(month),
    hint: `${month.from} - ${month.to}`,
  }));
}

async function chooseMonth(
  offered: ReadonlyArray<MonthRange>,
  today: CalendarDay,
): Promise<YearMonth | null> {
  const initial = pickDefaultMonth(offered, today) ?? offered[0];
  const selected = await p.select({
    message: "Which month are you filing?",
    options: monthOptions(offered),
    initialValue: initial === undefined ? undefined : monthValue(initial),
  });

  if (p.isCancel(selected)) {
    return null;
  }

  return offered.find((month) => monthValue(month) === String(selected)) ?? null;
}

async function chooseFile(matches: DiscoveredExport[]): Promise<DiscoveredExport | null> {
  const first = matches[0];
  if (matches.length === 1 && first !== undefined) {
    p.log.info(`Using ${first.filename}`);
    return first;
  }

  const selected = await p.select({
    message: "Several exports match this month. Which one?",
    options: matches.map((match) => ({
      value: match.path,
      label: match.filename,
      hint: match.name,
    })),
  });

  if (p.isCancel(selected)) {
    return null;
  }
  return matches.find((match) => match.path === selected) ?? null;
}

async function runImport(today: CalendarDay): Promise<number> {
  p.intro("Jira hours -> SAP preview");

  const directory = resolveExportDir(process.env);
  const offered = await listExportMonths(directory);

  if (offered.length === 0) {
    p.log.error(`No Jira exports found in ${directory}.`);
    p.log.info(
      "Download the monthly export from Tempo/Jira and run the import again. " +
        "The file name must look like User_ <Name>_2026-11-01_2026-11-30.csv.",
    );
    p.outro("Nothing to preview.");
    return EXIT_ERROR;
  }

  const month = await chooseMonth(offered, today);
  if (month === null) {
    p.cancel("Import cancelled.");
    return EXIT_CANCEL;
  }

  const range = monthRange(month.year, month.month);
  const matches = await findExports(directory, range);
  const file = await chooseFile(matches);
  if (file === null) {
    p.cancel("Import cancelled.");
    return EXIT_CANCEL;
  }

  const spinner = p.spinner();
  spinner.start("Reading the export");
  const result = await readExport(file.path, { year: month.year, month: month.month });
  spinner.stop(`Read ${result.rows.length} entries.`);

  const preview = buildPreview({
    range,
    filenameName: file.name,
    rows: result.rows,
    rowWarnings: result.warnings,
  });

  process.stdout.write(`\n${renderSummary(preview, { color: Boolean(process.stdout.isTTY) })}\n\n`);
  p.outro("Preview only. Nothing was sent to SAP.");
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
    return await runImport(todayFromDate(new Date()));
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
