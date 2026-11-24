import assert from "node:assert/strict";
import { test } from "node:test";
import {
  enumerateDates,
  formatEntryDate,
  parseCalendarDate,
  parseODataDate,
  validateCalendarDate,
} from "../src/date.js";

test("parses valid calendar dates", () => {
  assert.deepEqual(parseCalendarDate("2026-11-24"), { year: 2026, month: 11, day: 24 });
  assert.deepEqual(parseCalendarDate("2024-02-29"), { year: 2024, month: 2, day: 29 });
});

test("rejects impossible or malformed dates", () => {
  assert.equal(parseCalendarDate("2026-02-30"), null);
  assert.equal(parseCalendarDate("2025-02-29"), null);
  assert.equal(parseCalendarDate("24.11.2026"), null);
  assert.throws(() => validateCalendarDate("2026-13-01"), /not a valid YYYY-MM-DD/);
});

test("formats the work date without a timezone shift", () => {
  assert.equal(formatEntryDate("2026-11-24"), "2026-11-24T00:00:00");
});

test("enumerates an inclusive date range", () => {
  assert.deepEqual(enumerateDates("2026-11-01", "2026-11-03"), [
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
  ]);
  assert.deepEqual(enumerateDates("2026-11-02", "2026-11-02"), ["2026-11-02"]);
  assert.throws(() => enumerateDates("2026-11-03", "2026-11-01"), /ends before it starts/);
  assert.throws(() => enumerateDates("2025-01-01", "2026-12-31"), /exceeds 366 days/);
});

test("normalizes OData dates", () => {
  assert.equal(parseODataDate("/Date(1793577600000)/"), "2026-11-02");
  assert.equal(parseODataDate("2026-11-02T00:00:00"), "2026-11-02");
  assert.equal(parseODataDate(null), null);
});
