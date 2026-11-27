import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { ExportParseError, parseExport, readExport } from "../src/jira/csv.js";

const NOVEMBER = { year: 2026, month: 11 };
const FIXTURE = fileURLToPath(new URL("../data/timesheet.example.csv", import.meta.url));
const HEADER = "Issue Key,Issue summary,Hours,Work date,Period,Work Description";

test("reads the redacted fixture", async () => {
  const result = await readExport(FIXTURE, NOVEMBER);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.rows.length, 4);
  assert.deepEqual(
    result.rows.map((row) => [row.issueKey, row.workDate, row.minutes]),
    [
      ["DEMO-1", "2026-11-02", 180],
      ["DEMO-2", "2026-11-02", 90],
      ["DEMO-3", "2026-11-03", 120],
      ["DEMO-1", "2026-11-03", 30],
    ],
  );
});

test("preserves quoted commas and doubled quotes", async () => {
  const result = await readExport(FIXTURE, NOVEMBER);
  assert.equal(result.rows[0]?.description, "Daily, Refinement");
  assert.equal(result.rows[2]?.issueSummary, 'Demo "quoted"');
});

test("skips comma-only rows", () => {
  const blankRows = Array.from({ length: 61 }, () => ",,,,,").join("\n");
  const content = `${HEADER}\nDEMO-1,Demo,3,11/2/26 0:00,1126,Daily\n${blankRows}\n`;
  const result = parseExport(content, NOVEMBER);
  assert.equal(result.rows.length, 1);
  assert.equal(result.warnings.length, 0);
});

test("handles a BOM and CRLF line endings", () => {
  const content = `\uFEFF${HEADER}\r\nDEMO-1,Demo,3,11/2/26 0:00,1126,Daily\r\n`;
  const result = parseExport(content, NOVEMBER);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.minutes, 180);
});

test("accepts normalized header casing", () => {
  const content = "issue key,hours,work date\nDEMO-1,3,11/2/26\n";
  const result = parseExport(content, NOVEMBER);
  assert.equal(result.rows.length, 1);
});

test("rejects an export missing a required column", () => {
  assert.throws(
    () => parseExport("Issue Key,Hours\nDEMO-1,3\n", NOVEMBER),
    (error: unknown) => {
      assert.ok(error instanceof ExportParseError);
      assert.match(error.message, /Work Date/);
      return true;
    },
  );
});

test("warns about and excludes unparseable rows", () => {
  const content = [
    HEADER,
    "DEMO-1,Demo,abc,11/2/26 0:00,1126,Daily",
    "DEMO-2,Demo,0,11/2/26 0:00,1126,Daily",
    "DEMO-3,Demo,2,bad date,1126,Daily",
    "DEMO-4,Demo,1.5,11/2/26 0:00,1126,Daily",
  ].join("\n");
  const result = parseExport(content, NOVEMBER);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.issueKey, "DEMO-4");
  assert.equal(result.warnings.length, 3);
  assert.ok(result.warnings.every((warning) => /^(DEMO-\d|Row)/.test(warning.message)));
});

test("flags dates outside the selected month", () => {
  const content = `${HEADER}\nDEMO-1,Demo,2,12/5/26 0:00,1126,Daily\n`;
  const result = parseExport(content, NOVEMBER);
  assert.equal(result.rows[0]?.workDate, "2026-12-05");
  assert.equal(result.rows[0]?.outsideSelectedMonth, true);
});

test("returns no rows for a header-only export", () => {
  const result = parseExport(`${HEADER}\n`, NOVEMBER);
  assert.deepEqual(result.rows, []);
  assert.deepEqual(result.warnings, []);
});
