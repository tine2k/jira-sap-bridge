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
    ],
  });
}

test("renders the greeting, day rows, total, and warnings", () => {
  const text = renderSummary(preview(), { color: false });
  assert.match(text, /Hi Anna/);
  assert.match(text, /November 2026/);
  assert.match(text, /Mon 02 Nov/);
  assert.match(text, /Tue 03 Nov/);
  assert.match(text, /16 h total/);
  assert.match(text, /TOTAL/);
  assert.match(text, /Warnings/);
  assert.match(text, /above a normal 8 h day/);
});

test("emits ANSI color when enabled", () => {
  const text = renderSummary(preview(), { color: true });
  assert.match(text, ANSI);
  assert.match(text.replace(ANSI, ""), /Mon 02 Nov/);
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
