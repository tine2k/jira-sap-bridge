import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHours, parsePeriod, parseWorkDate } from "../src/jira/fields.js";

const NOVEMBER = { year: 2026, month: 11 };

test("parses the export's month-first work date", () => {
  assert.deepEqual(parseWorkDate("11/2/26 0:00", NOVEMBER, "1126"), {
    ok: true,
    date: "2026-11-02",
    outsideSelectedMonth: false,
  });
});

test("resolves an ambiguous date using the selected month", () => {
  assert.deepEqual(parseWorkDate("2/11/26 0:00", NOVEMBER, "1126"), {
    ok: true,
    date: "2026-11-02",
    outsideSelectedMonth: false,
  });
});

test("returns an out-of-month date with a flag", () => {
  assert.deepEqual(parseWorkDate("12/5/26 0:00", NOVEMBER, "1126"), {
    ok: true,
    date: "2026-12-05",
    outsideSelectedMonth: true,
  });
});

test("uses Period when the selected month does not match", () => {
  assert.deepEqual(parseWorkDate("12/5/26 0:00", NOVEMBER, "1226"), {
    ok: true,
    date: "2026-12-05",
    outsideSelectedMonth: true,
  });
});

test("rejects malformed dates and times", () => {
  assert.equal(parseWorkDate("not a date", NOVEMBER).ok, false);
  assert.equal(parseWorkDate("13/45/26 0:00", NOVEMBER).ok, false);
  assert.equal(parseWorkDate("11/2/26 25:00", NOVEMBER).ok, false);
});

test("accepts a four-digit year", () => {
  assert.deepEqual(parseWorkDate("11/2/2026", NOVEMBER), {
    ok: true,
    date: "2026-11-02",
    outsideSelectedMonth: false,
  });
});

test("parses decimal hours into minutes", () => {
  assert.deepEqual(parseHours("3"), { ok: true, minutes: 180 });
  assert.deepEqual(parseHours("1.5"), { ok: true, minutes: 90 });
  assert.deepEqual(parseHours("0.5"), { ok: true, minutes: 30 });
  assert.deepEqual(parseHours(".5"), { ok: true, minutes: 30 });
  assert.deepEqual(parseHours("1,5"), { ok: true, minutes: 90 });
});

test("rejects non-numeric, zero, and negative hours", () => {
  assert.equal(parseHours("abc").ok, false);
  assert.equal(parseHours("0").ok, false);
  assert.equal(parseHours("-1").ok, false);
});

test("parses the MMYY period", () => {
  assert.deepEqual(parsePeriod("1126"), { year: 2026, month: 11 });
  assert.equal(parsePeriod("1326"), null);
  assert.equal(parsePeriod("abc"), null);
});
