import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConnectionConfig } from "../src/config.ts";
import { compareMonth, compareTotals, renderComparison } from "../src/import/sap-compare.ts";
import { SapClient } from "../src/sap/client.ts";
import { fakeFetch } from "./helpers.ts";

const PLANNED = { hours: "16", entries: 8 };
const ENV = { S4_HOST: "https://tenant.example", EMPLOYEE_ID: "4711" };

test("sums CATSHOURS across strings and numbers", () => {
  const comparison = compareTotals(
    [
      { TimeEntryDataFields: { CATSHOURS: "7.5" } },
      { TimeEntryDataFields: { CATSHOURS: "0.5" } },
      { TimeEntryDataFields: { CATSHOURS: 1.25 } },
      { TimeEntryDataFields: {} },
      { TimeEntryDataFields: { CATSHOURS: "not a number" } },
    ],
    PLANNED,
  );

  assert.deepEqual(comparison, {
    recordedHours: "9.25",
    recordedEntries: 5,
    plannedHours: "16",
    plannedEntries: 8,
  });
});

test("an empty month records zero hours", () => {
  assert.deepEqual(compareTotals([], PLANNED), {
    recordedHours: "0",
    recordedEntries: 0,
    plannedHours: "16",
    plannedEntries: 8,
  });
});

test("rounds floating-point sums to two decimals", () => {
  const comparison = compareTotals(
    [
      { TimeEntryDataFields: { CATSHOURS: "1.1" } },
      { TimeEntryDataFields: { CATSHOURS: "2.2" } },
    ],
    PLANNED,
  );

  assert.equal(comparison.recordedHours, "3.3");
});

test("reads every day of the month for the configured employee", async () => {
  const seen: string[] = [];
  const comparison = await compareMonth(
    { year: 2026, month: 11, from: "2026-11-01", to: "2026-11-30" },
    PLANNED,
    ENV,
    {
      obtainSessionCookie: async () => "COOKIE",
      createClient: () => ({}) as SapClient,
      readEntries: async (_client, employeeId, date) => {
        seen.push(`${employeeId} ${date}`);
        return [];
      },
    },
  );

  assert.equal(seen.length, 30);
  assert.equal(seen[0], "4711 2026-11-01");
  assert.equal(seen.at(-1), "4711 2026-11-30");
  assert.deepEqual(comparison, {
    recordedHours: "0",
    recordedEntries: 0,
    plannedHours: "16",
    plannedEntries: 8,
  });
});

test("passes the session cookie to the client", async () => {
  let created: ConnectionConfig | undefined;
  await compareMonth({ year: 2026, month: 11, from: "2026-11-02", to: "2026-11-02" }, PLANNED, ENV, {
    obtainSessionCookie: async () => "SAP_SESSIONID_L54_100=COOKIE",
    createClient: (config) => {
      created = config;
      return {} as SapClient;
    },
    readEntries: async () => [],
  });

  assert.equal(created?.sessionCookie, "SAP_SESSIONID_L54_100=COOKIE");
});

test("reads with GET only", async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const fetchImpl = fakeFetch(
    [
      () =>
        new Response(JSON.stringify({ d: { results: [{ TimeEntryDataFields: { CATSHOURS: "8" } }] } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ],
    calls,
  );

  const comparison = await compareMonth(
    { year: 2026, month: 11, from: "2026-11-02", to: "2026-11-02" },
    PLANNED,
    ENV,
    {
      obtainSessionCookie: async () => "COOKIE",
      createClient: (config) => new SapClient(config, fetchImpl),
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "GET");
  assert.equal(calls[0]?.headers.cookie, "COOKIE");
  assert.equal(comparison.recordedHours, "8");
  assert.equal(comparison.recordedEntries, 1);
});

test("renders recorded and planned totals", () => {
  const text = renderComparison(
    {
      recordedHours: "4",
      recordedEntries: 1,
      plannedHours: "16",
      plannedEntries: 8,
    },
    { color: false },
  );

  assert.equal(
    text,
    ["SAP recorded: 4 h across 1 entry", "Import would insert: 16 h across 8 entries"].join("\n"),
  );
});
