import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseExportFilename, type ExportFilename } from "../jira/filename.ts";
import type { MonthRange } from "./month.ts";

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

/**
 * Lists CSV exports in `dir` whose filename date range exactly matches the
 * selected month. Never guesses: callers decide what to do with 0 or >1.
 */
export async function findExports(
  dir: string,
  range: Pick<MonthRange, "from" | "to">,
): Promise<DiscoveredExport[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ExportDiscoveryError(`Export directory not found: ${dir}`, dir);
    }
    throw error;
  }

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
