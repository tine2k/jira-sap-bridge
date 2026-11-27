import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { parseHours, parseWorkDate, type SelectedMonth } from "./fields.ts";
import type { ExportReadResult, RawRow, RowWarning } from "./types.ts";

const REQUIRED_COLUMNS = ["Issue Key", "Hours", "Work Date"] as const;

const CANONICAL_HEADERS: Record<string, string> = {
  "issue key": "Issue Key",
  "issue summary": "Issue Summary",
  hours: "Hours",
  "work date": "Work Date",
  "work description": "Work Description",
  "full name": "Full Name",
  period: "Period",
};

function canonicalHeader(header: string): string {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, " ");
  return CANONICAL_HEADERS[normalized] ?? header.trim();
}

export class ExportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportParseError";
  }
}

export type ExportContext = SelectedMonth;

interface ParsedRecord {
  record: Record<string, string | undefined>;
  info: { lines: number };
}

/**
 * Parses an export body. Rows that cannot be interpreted are returned as
 * warnings rather than aborting the whole preview; a missing required column
 * aborts because every downstream calculation would be wrong.
 */
export function parseExport(content: string, context: ExportContext): ExportReadResult {
  let headers: string[] = [];
  let records: ParsedRecord[];

  try {
    records = parse(content, {
      bom: true,
      columns: (header: string[]) => {
        headers = header.map(canonicalHeader);
        return headers;
      },
      info: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as unknown as ParsedRecord[];
  } catch (error) {
    throw new ExportParseError(`Could not parse export CSV: ${(error as Error).message}`);
  }

  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    throw new ExportParseError(`Export is missing required column(s): ${missing.join(", ")}`);
  }

  const rows: RawRow[] = [];
  const warnings: RowWarning[] = [];

  for (const { record, info } of records) {
    const issueKey = (record["Issue Key"] ?? "").trim();
    const workDateRaw = (record["Work Date"] ?? "").trim();
    const hoursRaw = (record["Hours"] ?? "").trim();
    const line = info.lines;

    // Trailing comma-only rows carry no data at all.
    if (issueKey === "" && workDateRaw === "" && hoursRaw === "") {
      continue;
    }

    if (issueKey === "") {
      warnings.push({ line, message: "Row has hours or a date but no Issue Key and was skipped." });
      continue;
    }

    const period = (record["Period"] ?? "").trim();
    const date = parseWorkDate(workDateRaw, context, period);
    if (!date.ok) {
      warnings.push({ line, message: `${issueKey}: ${date.error}` });
      continue;
    }

    const hours = parseHours(hoursRaw);
    if (!hours.ok) {
      warnings.push({ line, message: `${issueKey}: ${hours.error}` });
      continue;
    }

    rows.push({
      issueKey,
      issueSummary: (record["Issue Summary"] ?? "").trim(),
      description: (record["Work Description"] ?? "").trim(),
      workDate: date.date,
      minutes: hours.minutes,
      fullName: (record["Full Name"] ?? "").trim(),
      period,
      line,
      outsideSelectedMonth: date.outsideSelectedMonth,
    });
  }

  return { rows, warnings };
}

export async function readExport(
  path: string,
  context: ExportContext,
): Promise<ExportReadResult> {
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    throw new ExportParseError(`Could not read export ${path}: ${(error as Error).message}`);
  }
  return parseExport(content, context);
}
