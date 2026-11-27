import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseExportFilename, type ExportFilename } from "../jira/filename.ts";
import { monthRange, type MonthRange } from "./month.ts";

export interface DiscoveredExport extends ExportFilename {
  /** Absolute or directory-relative path to the export. */
  path: string;
  /** Basename of the export. */
  filename: string;
}

export class ExportDiscoveryError extends Error {
  readonly directory: string;

  constructor(message: string, directory: string) {
    super(message);
    this.name = "ExportDiscoveryError";
    this.directory = directory;
  }
}

async function readDirectory(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ExportDiscoveryError(`Export directory not found: ${dir}`, dir);
    }
    throw error;
  }
}

function fullMonthOf(parsed: ExportFilename): MonthRange | null {
  const range = monthRange(Number(parsed.from.slice(0, 4)), Number(parsed.from.slice(5, 7)));
  return range.from === parsed.from && range.to === parsed.to ? range : null;
}

/**
 * Lists the distinct calendar months that have a full-month export in `dir`,
 * newest first. Files that do not match the export pattern, or whose dates do
 * not span exactly one calendar month, are ignored.
 */
export async function listExportMonths(dir: string): Promise<MonthRange[]> {
  const entries = await readDirectory(dir);
  const months = new Map<string, MonthRange>();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const parsed = parseExportFilename(entry.name);
    if (parsed === null || months.has(parsed.from)) {
      continue;
    }
    const range = fullMonthOf(parsed);
    if (range !== null) {
      months.set(parsed.from, range);
    }
  }

  return [...months.values()].sort((left, right) => right.from.localeCompare(left.from));
}

/**
 * Lists CSV exports in `dir` whose filename date range exactly matches the
 * selected month. Never guesses: callers decide what to do with 0 or >1.
 */
export async function findExports(
  dir: string,
  range: Pick<MonthRange, "from" | "to">,
): Promise<DiscoveredExport[]> {
  const entries = await readDirectory(dir);

  const matches: DiscoveredExport[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const parsed = parseExportFilename(entry.name);
    if (parsed === null || parsed.from !== range.from || parsed.to !== range.to) {
      continue;
    }
    matches.push({ ...parsed, path: join(dir, entry.name), filename: entry.name });
  }

  return matches.sort((left, right) => left.filename.localeCompare(right.filename));
}
