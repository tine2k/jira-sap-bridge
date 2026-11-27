import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPreview } from "../src/jira/preview.ts";
import type { RawRow } from "../src/jira/types.ts";
import { renderSummary } from "../src/import/summary.ts";

const RANGE = { year: 2026, month: 11, from: "2026-11-01", to: "2026-11-30" };
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

function longNotePreview(note: string) {
  return buildPreview({
    range: RANGE,
    filenameName: "Muster-Lang Anna",
    rows: [row({ issueKey: "DEMO-1", description: note, workDate: "2026-11-02", minutes: 60 })],
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
  assert.equal(tableLines(text).length, 3);
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
