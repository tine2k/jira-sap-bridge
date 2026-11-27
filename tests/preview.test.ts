import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPreview,
  formatDayLabel,
  formatMonthLabel,
  isWeekend,
} from "../src/jira/preview.ts";
import type { RawRow } from "../src/jira/types.ts";

const RANGE = { year: 2026, month: 11, from: "2026-11-01", to: "2026-11-30" };

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

function sampleRows(fullName = "Doe Jane"): RawRow[] {
  return [
    row({ issueKey: "DEMO-1", workDate: "2026-11-02", minutes: 180, fullName }),
    row({ issueKey: "DEMO-2", workDate: "2026-11-02", minutes: 60, fullName }),
    row({ issueKey: "DEMO-3", workDate: "2026-11-02", minutes: 90, fullName }),
    row({ issueKey: "DEMO-4", workDate: "2026-11-02", minutes: 90, fullName }),
    row({ issueKey: "DEMO-5", workDate: "2026-11-03", minutes: 120, fullName }),
    row({ issueKey: "DEMO-1", workDate: "2026-11-03", minutes: 30, fullName }),
    row({ issueKey: "DEMO-6", workDate: "2026-11-03", minutes: 120, fullName }),
    row({ issueKey: "DEMO-3", workDate: "2026-11-03", minutes: 270, fullName }),
  ];
}

test("builds month totals from the sample-shaped export", () => {
  const preview = buildPreview({ range: RANGE, filenameName: "Doe Jane", rows: sampleRows() });
  assert.equal(preview.totalMinutes, 960);
  assert.equal(preview.totalHours, "16");
  assert.equal(preview.entryCount, 8);
  assert.equal(preview.days.length, 2);
  assert.deepEqual(
    preview.days.map((day) => [day.date, day.hours, day.entryCount]),
    [
      ["2026-11-02", "7", 4],
      ["2026-11-03", "9", 4],
    ],
  );
  assert.ok(!preview.warnings.some((warning) => warning.kind === "long-day"));
});

test("reports no warnings for ordinary in-month days", () => {
  const preview = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [
      row({ issueKey: "DEMO-1", workDate: "2026-11-02", minutes: 240 }),
      row({ issueKey: "DEMO-2", workDate: "2026-11-03", minutes: 300 }),
    ],
  });
  assert.deepEqual(preview.warnings, []);
});

test("flags weekend work", () => {
  const preview = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [row({ workDate: "2026-11-07", minutes: 120 })],
  });
  assert.equal(isWeekend("2026-11-07"), true);
  assert.equal(formatDayLabel("2026-11-07"), "Sat 07 Nov");
  assert.ok(preview.warnings.some((warning) => warning.kind === "weekend"));
});

test("warns only for days above twelve hours", () => {
  const atThreshold = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [row({ workDate: "2026-11-02", minutes: 12 * 60 })],
  });
  assert.ok(!atThreshold.warnings.some((warning) => warning.kind === "long-day"));

  const aboveThreshold = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [row({ workDate: "2026-11-02", minutes: 12 * 60 + 1 })],
  });
  assert.ok(aboveThreshold.warnings.some((warning) => warning.kind === "long-day"));
});

test("distinguishes a long day from an impossible day", () => {
  const longDay = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [row({ workDate: "2026-11-02", minutes: 13 * 60 })],
  });
  assert.ok(longDay.warnings.some((warning) => warning.kind === "long-day"));
  assert.ok(!longDay.warnings.some((warning) => warning.kind === "invalid-day"));

  const impossible = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [row({ workDate: "2026-11-02", minutes: 25 * 60 })],
  });
  assert.ok(impossible.warnings.some((warning) => warning.kind === "invalid-day"));
  assert.ok(!impossible.warnings.some((warning) => warning.kind === "long-day"));
});

test("excludes dates outside the selected month from totals", () => {
  const preview = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [
      row({ workDate: "2026-11-02", minutes: 180 }),
      row({ workDate: "2026-12-05", minutes: 120, outsideSelectedMonth: true }),
    ],
  });
  assert.equal(preview.totalHours, "3");
  assert.equal(preview.entryCount, 1);
  assert.ok(preview.warnings.some((warning) => warning.kind === "outside-month"));
});

test("warns when the filename and CSV name disagree", () => {
  const preview = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [row({ fullName: "Smith John" })],
  });
  const warning = preview.warnings.find((entry) => entry.kind === "name-mismatch");
  assert.ok(warning !== undefined);
  assert.match(warning.message, /Doe Jane/);
  assert.match(warning.message, /Smith John/);
});

test("warns when Period does not match the selected month", () => {
  const preview = buildPreview({
    range: RANGE,
    filenameName: "Doe Jane",
    rows: [row({ period: "1226" })],
  });
  assert.ok(preview.warnings.some((warning) => warning.kind === "period-mismatch"));
});

test("warns when a day's note is truncated", () => {
  const rows = Array.from({ length: 20 }, (_, index) =>
    row({ issueKey: `DEMO-${index}`, description: "a fairly long description" }),
  );
  const preview = buildPreview({ range: RANGE, filenameName: "Doe Jane", rows });
  assert.ok(preview.warnings.some((warning) => warning.kind === "truncated-note"));
});

test("formats month labels", () => {
  assert.equal(formatMonthLabel(RANGE), "November 2026");
});
