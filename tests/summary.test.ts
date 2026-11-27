import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPreview } from "../src/jira/preview.ts";
import type { RawRow } from "../src/jira/types.ts";
import { renderSummary } from "../src/import/summary.ts";

const RANGE = { year: 2026, month: 11, from: "2026-11-01", to: "2026-11-30" };
const JANUARY_RANGE = { year: 2027, month: 1, from: "2027-01-01", to: "2027-01-31" };
const ANSI = /\u001b\[[0-9;]*m/g;

function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    issueKey: "DEMO-1",
    issueSummary: "Summary",
    description: "Daily",
    workDate: "2026-11-02",
    minutes: 180,
    fullName: "Muster-Lang Anna",
    period: "1126",
    line: 2,
    outsideSelectedMonth: false,
    ...overrides,
  };
}

function preview() {
  return buildPreview({
    range: RANGE,
    filenameName: "Muster-Lang Anna",
    rows: [
      row({ issueKey: "DEMO-1", workDate: "2026-11-02", minutes: 180 }),
      row({ issueKey: "DEMO-2", workDate: "2026-11-02", minutes: 60 }),
      row({ issueKey: "DEMO-3", workDate: "2026-11-02", minutes: 90 }),
      row({ issueKey: "DEMO-4", workDate: "2026-11-02", minutes: 90 }),
      row({ issueKey: "DEMO-5", workDate: "2026-11-03", minutes: 120 }),
      row({ issueKey: "DEMO-1", workDate: "2026-11-03", minutes: 30 }),
      row({ issueKey: "DEMO-6", workDate: "2026-11-03", minutes: 120 }),
      row({ issueKey: "DEMO-3", workDate: "2026-11-03", minutes: 270 }),
      row({ issueKey: "DEMO-7", workDate: "2026-11-02", minutes: 6 * 60 }),
    ],
  });
}

function datesPreview(dates: string[], range = RANGE) {
  const period = `${String(range.month).padStart(2, "0")}${String(range.year).slice(-2)}`;
  return buildPreview({
    range,
    filenameName: "Muster-Lang Anna",
    rows: dates.map((workDate, index) =>
      row({ issueKey: `DEMO-${index + 1}`, workDate, minutes: 60, period }),
    ),
  });
}

function plainLines(text: string): string[] {
  return text.replace(ANSI, "").split("\n");
}

test("renders the greeting, day rows, total, and warnings", () => {
  const text = renderSummary(preview(), { color: false });
  assert.match(text, /Hi Anna/);
  assert.match(text, /November 2026/);
  assert.match(text, /Mon 02 Nov/);
  assert.match(text, /Tue 03 Nov/);
  assert.match(text, /22 h total/);
  assert.match(text, /TOTAL/);
  assert.match(text, /Warnings/);
  assert.match(text, /above a normal 12 h day/);
});

test("emits ANSI color when enabled", () => {
  const text = renderSummary(preview(), { color: true });
  assert.match(text, ANSI);
  assert.match(text.replace(ANSI, ""), /Mon 02 Nov/);
});

test("places week titles before the first day and the next week", () => {
  const text = renderSummary(datesPreview(["2026-11-06", "2026-11-09"]), { color: false });
  const lines = plainLines(text);
  const firstWeek = lines.findIndex((line) => line.includes("Week 45"));
  const friday = lines.findIndex((line) => line.includes("Fri 06 Nov"));
  const secondWeek = lines.findIndex((line) => line.includes("Week 46"));
  const monday = lines.findIndex((line) => line.includes("Mon 09 Nov"));

  assert.ok(firstWeek >= 0);
  assert.ok(firstWeek < friday, "first week title should precede the first day");
  assert.ok(friday < secondWeek && secondWeek < monday, "second week title should precede Monday");
  assert.equal(lines.filter((line) => /Week \d+/.test(line)).length, 2);
});

test("places a week title when the new week starts after a missing Monday", () => {
  const text = renderSummary(datesPreview(["2026-11-06", "2026-11-10"]), { color: false });
  const lines = plainLines(text);
  const friday = lines.findIndex((line) => line.includes("Fri 06 Nov"));
  const tuesday = lines.findIndex((line) => line.includes("Tue 10 Nov"));
  const firstWeek = lines.findIndex((line) => line.includes("Week 45"));
  const secondWeek = lines.findIndex((line) => line.includes("Week 46"));

  assert.ok(firstWeek < friday);
  assert.ok(friday < secondWeek && secondWeek < tuesday);
  assert.doesNotMatch(text, /Mon 09 Nov/);
});

test("adds one week title for a single week and none after the last day", () => {
  const sameWeek = renderSummary(preview(), { color: false });
  const sameWeekLines = plainLines(sameWeek);
  const firstDay = sameWeekLines.findIndex((line) => line.includes("Mon 02 Nov"));
  const titleLines = sameWeekLines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /Week \d+/.test(line));

  assert.equal(titleLines.length, 1);
  assert.ok((titleLines[0]?.index ?? -1) < firstDay);

  const text = renderSummary(datesPreview(["2026-11-06", "2026-11-09", "2026-11-10"]), {
    color: false,
  });
  const lines = plainLines(text);
  const friday = lines.findIndex((line) => line.includes("Fri 06 Nov"));
  const tuesday = lines.findIndex((line) => line.includes("Tue 10 Nov"));
  const weekTitles = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /Week \d+/.test(line));

  assert.equal(weekTitles.length, 2);
  assert.ok(weekTitles[0] !== undefined && weekTitles[0].index < friday);
  assert.ok(weekTitles.every(({ index }) => index < tuesday));
});

test("uses the ISO week number across a year boundary", () => {
  const text = renderSummary(datesPreview(["2027-01-01", "2027-01-04"], JANUARY_RANGE), {
    color: false,
  });
  const lines = plainLines(text);
  const friday = lines.findIndex((line) => line.includes("Fri 01 Jan"));
  const monday = lines.findIndex((line) => line.includes("Mon 04 Jan"));
  const firstWeek = lines.findIndex((line) => line.includes("Week 53"));
  const secondWeek = lines.findIndex((line) => line.includes("Week 1"));

  assert.ok(firstWeek < friday);
  assert.ok(friday < secondWeek && secondWeek < monday);
});

test("colors the week title and draws no horizontal rule", () => {
  const preview = datesPreview(["2026-11-06", "2026-11-09"]);
  const coloredText = renderSummary(preview, { color: true });
  const coloredMarker = coloredText.split("\n").find((line) => line.includes("Week 46"));
  assert.ok(coloredMarker !== undefined);
  assert.match(coloredMarker, /\u001b\[36m/);
  assert.match(coloredMarker, /\u001b\[1m/);
  assert.doesNotMatch(coloredMarker.replace(ANSI, ""), /\u2500/);

  const plainText = renderSummary(preview, { color: false });
  const plainMarker = plainText.split("\n").find((line) => line.includes("Week 46"));
  assert.ok(plainMarker !== undefined);
  assert.doesNotMatch(plainMarker, ANSI);
  assert.match(plainMarker, /^\u2502 Week 46\s+\u2502$/);
  assert.equal(coloredMarker.replace(ANSI, "").length, plainMarker.length);
});

function longNotePreview(note: string) {
  return buildPreview({
    range: RANGE,
    filenameName: "Muster-Lang Anna",
    rows: [row({ issueKey: "DEMO-1", description: note, workDate: "2026-11-02", minutes: 60 })],
  });
}

function longWeekPreview(note: string) {
  return buildPreview({
    range: RANGE,
    filenameName: "Muster-Lang Anna",
    rows: [
      row({ issueKey: "DEMO-1", description: note, workDate: "2026-11-06", minutes: 60 }),
      row({ issueKey: "DEMO-2", description: note, workDate: "2026-11-09", minutes: 60 }),
    ],
  });
}

function tableLines(text: string): string[] {
  return text.replace(ANSI, "").split("\n").filter((line) => line.includes("│"));
}

test("sizes the table to an explicit width and keeps every line within it", () => {
  const text = renderSummary(longNotePreview("word ".repeat(80)), { color: false, width: 80 });
  for (const line of tableLines(text)) {
    assert.ok(line.length <= 80, `line is ${line.length} columns: ${line}`);
  }
});

test("keeps week markers on one line within narrow and wide widths", () => {
  for (const width of [70, 160]) {
    for (const color of [false, true]) {
      const text = renderSummary(longWeekPreview("word ".repeat(80)), { color, width });
      for (const line of tableLines(text)) {
        assert.ok(line.length <= width, `line is ${line.length} columns at width ${width}: ${line}`);
      }

      const titleLines = plainLines(text).filter((line) => /Week \d+/.test(line));
      assert.equal(titleLines.length, 2);
      assert.match(titleLines[0] ?? "", /^\u2502 Week 45\s+\u2502$/);
      assert.match(titleLines[1] ?? "", /^\u2502 Week 46\s+\u2502$/);
      for (const line of titleLines) {
        assert.doesNotMatch(line, /\u2500/);
      }
    }
  }
});

test("uses the terminal width by default and falls back to 80 without one", () => {
  const stdout = process.stdout as { columns?: number };
  const columns = stdout.columns;
  try {
    stdout.columns = 120;
    const wide = renderSummary(longNotePreview("word ".repeat(80)), { color: false });
    assert.ok(tableLines(wide).some((line) => line.length > 80));
    assert.ok(tableLines(wide).every((line) => line.length <= 120));

    stdout.columns = undefined;
    const fallback = renderSummary(longNotePreview("word ".repeat(80)), { color: false });
    assert.ok(tableLines(fallback).every((line) => line.length <= 80));
  } finally {
    stdout.columns = columns;
  }
});

test("keeps a short table compact instead of stretching to the width", () => {
  const text = renderSummary(longNotePreview("Daily"), { color: false, width: 120 });
  assert.ok(tableLines(text).every((line) => line.length < 60));
});

test("keeps a note on one line when the terminal is wide enough", () => {
  const text = renderSummary(longNotePreview("word ".repeat(20)), { color: false, width: 160 });
  assert.equal(tableLines(text).length, 4);
  assert.match(text, /DEMO-1:/);
});

test("renders no day table for an empty export", () => {
  const empty = buildPreview({
    range: RANGE,
    filenameName: "Muster-Lang Anna",
    rows: [],
  });
  const text = renderSummary(empty, { color: false });
  assert.match(text, /No worked hours were found/);
  assert.doesNotMatch(text, /Description/);
  assert.doesNotMatch(text, /TOTAL/);
});
