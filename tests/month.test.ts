import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultMonth, monthRange, previousMonth } from "../src/import/month.ts";

test("defaults to the previous month on days 1-10", () => {
  assert.deepEqual(defaultMonth({ year: 2026, month: 11, day: 1 }), { year: 2026, month: 10 });
  assert.deepEqual(defaultMonth({ year: 2026, month: 11, day: 10 }), { year: 2026, month: 10 });
});

test("defaults to the current month on days 11-31", () => {
  assert.deepEqual(defaultMonth({ year: 2026, month: 11, day: 11 }), { year: 2026, month: 11 });
  assert.deepEqual(defaultMonth({ year: 2026, month: 11, day: 30 }), { year: 2026, month: 11 });
});

test("crosses the year boundary when proposing the previous month", () => {
  assert.deepEqual(defaultMonth({ year: 2026, month: 1, day: 3 }), { year: 2025, month: 12 });
  assert.deepEqual(defaultMonth({ year: 2026, month: 12, day: 15 }), { year: 2026, month: 12 });
  assert.deepEqual(previousMonth({ year: 2026, month: 12 }), { year: 2026, month: 11 });
});

test("honours a custom cutoff day", () => {
  assert.deepEqual(defaultMonth({ year: 2026, month: 6, day: 15 }, 20), { year: 2026, month: 5 });
  assert.deepEqual(defaultMonth({ year: 2026, month: 6, day: 21 }, 20), { year: 2026, month: 6 });
});

test("builds an inclusive month range", () => {
  assert.deepEqual(monthRange(2026, 11), {
    year: 2026,
    month: 11,
    from: "2026-11-01",
    to: "2026-11-30",
  });
  assert.equal(monthRange(2028, 2).to, "2028-02-29");
  assert.equal(monthRange(2026, 2).to, "2026-02-28");
});

test("rejects invalid months and days", () => {
  assert.throws(() => monthRange(2026, 0), RangeError);
  assert.throws(() => monthRange(2026, 13), RangeError);
  assert.throws(() => defaultMonth({ year: 2026, month: 11, day: 0 }), RangeError);
});
