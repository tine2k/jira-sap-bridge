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
 * Lists the CSV exports in `dir` that span exactly one calendar month, newest
 * month first and then by filename. Files that do not match the export
 * pattern, or whose dates do not span exactly one calendar month, are ignored.
 */
export async function listExports(dir: string): Promise<DiscoveredExport[]> {
  const entries = await readDirectory(dir);

  const exports: DiscoveredExport[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const parsed = parseExportFilename(entry.name);
    if (parsed === null || fullMonthOf(parsed) === null) {
      continue;
    }
    exports.push({ ...parsed, path: join(dir, entry.name), filename: entry.name });
  }

  return exports.sort(
    (left, right) =>
      right.from.localeCompare(left.from) || left.filename.localeCompare(right.filename),
  );
}
