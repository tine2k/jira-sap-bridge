import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateDays, formatHours, NOTE_MAX_LENGTH } from "../src/jira/aggregate.ts";
import type { RawRow } from "../src/jira/types.ts";

function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    issueKey: "DEMO-1",
    issueSummary: "Summary",
    description: "Desc",
    workDate: "2026-11-02",
    minutes: 60,
    fullName: "Doe Jane",
    period: "1126",
    line: 2,
    outsideSelectedMonth: false,
    ...overrides,
  };
}

test("sums a day's entries and counts them", () => {
  const days = aggregateDays([
    row({ issueKey: "DEMO-1", minutes: 180 }),
    row({ issueKey: "DEMO-2", minutes: 60 }),
    row({ issueKey: "DEMO-3", minutes: 90 }),
    row({ issueKey: "DEMO-4", minutes: 90 }),
  ]);
  assert.equal(days.length, 1);
  assert.equal(days[0]?.minutes, 420);
  assert.equal(days[0]?.hours, "7");
  assert.equal(days[0]?.entryCount, 4);
});

test("merges descriptions for the same issue key", () => {
  const days = aggregateDays([
    row({ issueKey: "DEMO-1", description: "Daily" }),
    row({ issueKey: "DEMO-1", description: "Refinement" }),
    row({ issueKey: "DEMO-2", description: "Build" }),
  ]);
  assert.equal(days[0]?.note, "DEMO-1: Daily, Refinement; DEMO-2: Build");
});

test("falls back to the issue summary when the description is empty", () => {
  const days = aggregateDays([row({ description: "   ", issueSummary: "Fix login" })]);
  assert.equal(days[0]?.note, "DEMO-1: Fix login");
});

test("preserves first-seen issue key order", () => {
  const days = aggregateDays([
    row({ issueKey: "DEMO-9", description: "Last" }),
    row({ issueKey: "DEMO-2", description: "Middle" }),
    row({ issueKey: "DEMO-5", description: "First" }),
  ]);
  assert.deepEqual(
    days[0]?.items.map((item) => item.issueKey),
    ["DEMO-9", "DEMO-2", "DEMO-5"],
  );
});

test("truncates the note at the cap without splitting a segment", () => {
  const rows = Array.from({ length: 20 }, (_, index) =>
    row({
      issueKey: `DEMO-${index}`,
      description: "a fairly long description",
    }),
  );
  const day = aggregateDays(rows)[0];
  assert.ok(day !== undefined);
  assert.ok(day.note.length <= NOTE_MAX_LENGTH);
  assert.ok(day.truncatedKeys.length > 0);
  assert.ok(day.note.endsWith("description"));
  assert.ok(day.truncatedKeys.every((key) => !day.note.includes(`${key}:`)));
});

test("keeps a readable prefix when the first segment alone is too long", () => {
  const day = aggregateDays([
    row({ issueKey: "DEMO-1", description: "x".repeat(400) }),
    row({ issueKey: "DEMO-2", description: "never fits" }),
  ])[0];
  assert.ok(day !== undefined);
  assert.equal(day.note.length, NOTE_MAX_LENGTH);
  assert.ok(day.note.endsWith("..."));
  assert.deepEqual(day.truncatedKeys, ["DEMO-1", "DEMO-2"]);
});

test("formats minutes as decimal hours", () => {
  assert.equal(formatHours(180), "3");
  assert.equal(formatHours(90), "1.5");
  assert.equal(formatHours(30), "0.5");
  assert.equal(formatHours(421), "7.02");
});
