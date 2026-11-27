import pc from "picocolors";
import { loadConnectionConfig, loadEmployeeConfig, type ConnectionConfig, type Env } from "../config.ts";
import { enumerateDates } from "../date.ts";
import { obtainSessionCookie } from "../sap/browser.ts";
import { SapClient, type TimeEntry } from "../sap/client.ts";
import type { MonthRange } from "./month.ts";

export interface PlannedTotals {
  /** Hours the import would insert, as shown by the preview. */
  hours: string;
  entries: number;
}

export interface SapComparison {
  recordedHours: string;
  recordedEntries: number;
  plannedHours: string;
  plannedEntries: number;
}

export interface SapCompareDependencies {
  obtainSessionCookie?: (config: ConnectionConfig) => Promise<string>;
  createClient?: (config: ConnectionConfig) => SapClient;
  readEntries?: (client: SapClient, employeeId: string, date: string) => Promise<TimeEntry[]>;
}

function recordedHoursOf(entry: TimeEntry): number {
  const raw = entry.TimeEntryDataFields?.CATSHOURS;
  const value =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Pairs SAP's recorded month with the hours the preview would insert. */
export function compareTotals(
  entries: ReadonlyArray<TimeEntry>,
  planned: PlannedTotals,
): SapComparison {
  const recorded = entries.reduce((sum, entry) => sum + recordedHoursOf(entry), 0);
  return {
    recordedHours: String(round2(recorded)),
    recordedEntries: entries.length,
    plannedHours: planned.hours,
    plannedEntries: planned.entries,
  };
}

/** Authenticates once, then reads every day of the selected month. Read-only. */
export async function compareMonth(
  range: MonthRange,
  planned: PlannedTotals,
  env: Env = process.env,
  deps: SapCompareDependencies = {},
): Promise<SapComparison> {
  const connection = loadConnectionConfig(env);
  const { employeeId } = loadEmployeeConfig(env);

  const cookie = await (deps.obtainSessionCookie ?? obtainSessionCookie)(connection);
  const createClient =
    deps.createClient ?? ((config: ConnectionConfig) => new SapClient(config));
  const client = createClient({ ...connection, sessionCookie: cookie });
  const read =
    deps.readEntries ??
    ((target: SapClient, pernr: string, date: string) => target.readEntries(pernr, date));

  const entries: TimeEntry[] = [];
  for (const date of enumerateDates(range.from, range.to)) {
    entries.push(...(await read(client, employeeId, date)));
  }

  return compareTotals(entries, planned);
}

/** Two plain lines; colors follow the same switch as the summary. */
export function renderComparison(
  comparison: SapComparison,
  options: { color?: boolean } = {},
): string {
  const colors = pc.createColors(options.color ?? Boolean(process.stdout.isTTY));
  const recordedWord = comparison.recordedEntries === 1 ? "entry" : "entries";
  const plannedWord = comparison.plannedEntries === 1 ? "entry" : "entries";

  return [
    `${colors.cyan("SAP recorded:")} ${colors.bold(`${comparison.recordedHours} h`)} across ` +
      `${comparison.recordedEntries} ${recordedWord}`,
    `${colors.bold("Import would insert:")} ${colors.bold(`${comparison.plannedHours} h`)} across ` +
      `${comparison.plannedEntries} ${plannedWord}`,
  ].join("\n");
}
