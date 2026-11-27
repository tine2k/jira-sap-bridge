import { parseCalendarDate } from "../date.ts";

export interface ExportFilename {
  /** Person name exactly as it appears between the prefix and the date range. */
  name: string;
  /** First calendar day of the exported range, YYYY-MM-DD. */
  from: string;
  /** Last calendar day of the exported range, YYYY-MM-DD. */
  to: string;
}

const FILENAME_PATTERN =
  /^(?:User_[ \t]*)?(?<name>.+?)_(?<from>\d{4}-\d{2}-\d{2})_(?<to>\d{4}-\d{2}-\d{2})\.csv$/i;

/**
 * Parses `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv` from the right so names
 * containing spaces or underscores still work. Returns null for anything that
 * is not a valid export filename with a sane date range.
 */
export function parseExportFilename(filename: string): ExportFilename | null {
  const match = FILENAME_PATTERN.exec(filename.trim());
  if (match?.groups === undefined) {
    return null;
  }

  const name = match.groups.name?.trim() ?? "";
  const from = match.groups.from ?? "";
  const to = match.groups.to ?? "";

  if (name.length === 0 || from.length === 0 || to.length === 0) {
    return null;
  }

  if (parseCalendarDate(from) === null || parseCalendarDate(to) === null) {
    return null;
  }

  if (to < from) {
    return null;
  }

  return { name, from, to };
}

/**
 * The export lists the surname before the given name (`Surname Firstname`),
 * so the first name is the last whitespace-separated token.
 */
export function firstNameFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? name.trim();
}
