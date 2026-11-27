import "dotenv/config";
import { ConfigError, loadConfig, loadConnectionConfig, loadEmployeeConfig, type ConnectionConfig } from "./config.js";
import { enumerateDates, parseCalendarDate, parseODataDate, validateCalendarDate } from "./date.js";
import { BrowserAuthError, obtainSessionCookie } from "./sap/browser.js";
import { SapClient, SapRequestError, SapTransportError, type TimeEntry } from "./sap/client.js";
import { buildEntryPayload } from "./sap/entry.js";

const USAGE = `Usage: npm run timesheet -- <command>

Commands:
  add                  Create one time entry from ENTRY_* settings
  read [options]       Read existing entries

Read options:
  --from YYYY-MM-DD    First day (default: ENTRY_DATE)
  --to YYYY-MM-DD      Last day (default: --from)
  --json               Print JSON instead of a table
`;

interface ReadOptions {
  from: string;
  to: string;
  json: boolean;
}

function parseReadOptions(args: string[]): ReadOptions {
  let from: string | undefined;
  let to: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--from" || arg === "--to") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error(`${arg} requires a YYYY-MM-DD value`);
      }
      index += 1;
      if (arg === "--from") {
        from = value;
      } else {
        to = value;
      }
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (from === undefined && to === undefined && parseCalendarDate(arg) !== null) {
      from = arg;
      to = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  const start = from ?? process.env.ENTRY_DATE;
  if (start === undefined || start === "") {
    throw new Error("Provide --from/--to or set ENTRY_DATE.");
  }

  const end = to ?? start;
  validateCalendarDate(start);
  validateCalendarDate(end);
  enumerateDates(start, end);

  return { from: start, to: end, json };
}

function extractRecord(data: unknown): Record<string, unknown> {
  if (data !== null && typeof data === "object" && !Array.isArray(data) && "d" in data) {
    const payload = (data as Record<string, unknown>).d;
    if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }
  }
  return {};
}

async function resolveSession(config: ConnectionConfig): Promise<ConnectionConfig> {
  process.stderr.write("Opening browser for SAP login (complete the SSO/MFA prompt)...\n");
  const cookie = await obtainSessionCookie(config);
  return { ...config, sessionCookie: cookie };
}

async function runAdd(): Promise<number> {
  const config = loadConfig();
  const connection = await resolveSession(config);
  const client = new SapClient(connection);
  const result = await client.addEntry(buildEntryPayload(config));
  const record = extractRecord(result.data);

  console.log(`Entry created (HTTP ${result.status}).`);
  console.log(`  Pernr:    ${config.employeeId}`);
  if (typeof record.Counter === "string") {
    console.log(`  Counter:  ${record.Counter}`);
  }
  if (typeof record.WorkDate === "string") {
    console.log(`  WorkDate: ${parseODataDate(record.WorkDate) ?? record.WorkDate}`);
  }
  return 0;
}

async function runRead(args: string[]): Promise<number> {
  const connection = await resolveSession(loadConnectionConfig());
  const { employeeId } = loadEmployeeConfig();
  const options = parseReadOptions(args);
  const dates = enumerateDates(options.from, options.to);
  const client = new SapClient(connection);

  const rows: Array<{ date: string; entry: TimeEntry }> = [];
  for (const date of dates) {
    for (const entry of await client.readEntries(employeeId, date)) {
      rows.push({ date, entry });
    }
  }

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return 0;
  }

  if (rows.length === 0) {
    console.log(`No entries for ${employeeId} between ${options.from} and ${options.to}.`);
    return 0;
  }

  console.log("Counter        Date        Hours  Status  Note");
  for (const { date, entry } of rows) {
    const fields = entry.TimeEntryDataFields ?? {};
    console.log(
      [
        String(entry.Counter ?? "").padEnd(14),
        date.padEnd(10),
        String(fields.CATSHOURS ?? "").padEnd(6),
        String(entry.Status ?? "").padEnd(7),
        String(fields.LTXA1 ?? "").replace(/\s+/g, " ").slice(0, 80),
      ].join("  "),
    );
  }
  return 0;
}

function reportError(error: unknown): void {
  if (error instanceof ConfigError) {
    console.error(`Configuration error: ${error.message}`);
    return;
  }
  if (error instanceof SapRequestError) {
    console.error(error.message);
    if (error.body.length > 0) {
      console.error(/^\s*<html/i.test(error.body) ? "SAP returned a login page; the session expired." : error.body);
    }
    return;
  }
  if (error instanceof SapTransportError || error instanceof BrowserAuthError) {
    console.error(error.message);
    return;
  }
  console.error(`Error: ${(error as Error).message}`);
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (command === undefined || command === "--help" || command === "-h" || command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }

  if (command === "add") {
    return runAdd();
  }

  if (command === "read") {
    return runRead(rest);
  }

  process.stderr.write(`Unknown command: ${command}\n\n`);
  process.stdout.write(USAGE);
  return 1;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    reportError(error);
    process.exitCode = 1;
  });
