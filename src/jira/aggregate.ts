import type { RawRow } from "./types.ts";

export const NOTE_MAX_LENGTH = 255;
const ELLIPSIS = "...";

export interface DayItem {
  issueKey: string;
  descriptions: string[];
}

export interface DayEntry {
  /** Calendar day, YYYY-MM-DD. */
  date: string;
  minutes: number;
  /** Decimal hours formatted for display and SAP, e.g. "7" or "1.5". */
  hours: string;
  entryCount: number;
  items: DayItem[];
  note: string;
  /** Issue keys omitted because the note hit the length cap. */
  truncatedKeys: string[];
}

export function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 100) / 100;
  return String(hours);
}

function buildNote(items: DayItem[]): { note: string; truncatedKeys: string[] } {
  const segments = items.map((item) =>
    item.descriptions.length > 0
      ? `${item.issueKey}: ${item.descriptions.join(", ")}`
      : item.issueKey,
  );

  let note = "";
  const truncatedKeys: string[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] ?? "";
    const candidate = note.length === 0 ? segment : `${note}; ${segment}`;

    if (candidate.length <= NOTE_MAX_LENGTH) {
      note = candidate;
      continue;
    }

    for (let remaining = index; remaining < items.length; remaining += 1) {
      const item = items[remaining];
      if (item !== undefined) {
        truncatedKeys.push(item.issueKey);
      }
    }

    // A single leading segment can exceed the cap on its own; keep a readable
    // prefix rather than an empty note.
    if (note.length === 0 && segment.length > NOTE_MAX_LENGTH) {
      note = `${segment.slice(0, NOTE_MAX_LENGTH - ELLIPSIS.length)}${ELLIPSIS}`;
    }
    break;
  }

  return { note, truncatedKeys };
}

/**
 * Groups rows by calendar work date, sums minutes, then groups each day by
 * issue key. Descriptions for one key are joined with ", ", and keys with "; "
 * in first-seen order. Empty descriptions fall back to the issue summary.
 */
export function aggregateDays(rows: RawRow[]): DayEntry[] {
  const byDate = new Map<string, { minutes: number; entryCount: number; keys: Map<string, string[]> }>();

  for (const row of rows) {
    let day = byDate.get(row.workDate);
    if (day === undefined) {
      day = { minutes: 0, entryCount: 0, keys: new Map() };
      byDate.set(row.workDate, day);
    }

    day.minutes += row.minutes;
    day.entryCount += 1;

    const description =
      row.description.trim().length > 0 ? row.description.trim() : row.issueSummary.trim();
    const descriptions = day.keys.get(row.issueKey);
    if (descriptions === undefined) {
      day.keys.set(row.issueKey, description.length > 0 ? [description] : []);
    } else if (description.length > 0) {
      descriptions.push(description);
    }
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, day]) => {
      const items: DayItem[] = [...day.keys.entries()].map(([issueKey, descriptions]) => ({
        issueKey,
        descriptions,
      }));
      const { note, truncatedKeys } = buildNote(items);

      return {
        date,
        minutes: day.minutes,
        hours: formatHours(day.minutes),
        entryCount: day.entryCount,
        items,
        note,
        truncatedKeys,
      };
    });
}
