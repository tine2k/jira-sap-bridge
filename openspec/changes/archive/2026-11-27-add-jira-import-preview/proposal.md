# Proposal

## Why

Recording a month of project work currently requires reading a Jira CSV export by hand and re-entering each day into SAP one entry at a time. A guided preview that discovers the export, aggregates it by day, and shows exactly what would be posted removes the manual transcription without yet risking any SAP write.

## What Changes

- Add a TUI command (`npm run import`) that walks the user through a monthly Jira export import.
- Propose the reporting month: days 1–10 default to the previous month, days 11+ to the current month; the user can pick another month.
- Discover the matching export in a configurable directory (default `~/Downloads`) by filename pattern `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`, and let the user choose if several match.
- Parse the export: CRLF/BOM-safe CSV, quoted fields, `M/D/YY H:mm` work dates, decimal hours, and trailing blank rows.
- Aggregate per calendar day: sum `Hours`, group entries by `Issue Key`, and concatenate `KEY: Work Description` segments.
- Print a colorful per-day summary with totals and warnings (weekend, long day, out-of-range date, identity/period mismatch, note truncation).
- Add `JIRA_EXPORT_DIR` configuration and a gitignore rule for real exports.

**Out of scope:** any SAP write, duplicate detection against SAP, and the confirmation step. Those follow in a later change once the preview is accepted.

## Capabilities

### New Capabilities

- `jira-timesheet-import`: month selection, export discovery, Jira CSV parsing, per-day aggregation, and the read-only preview summary.

### Modified Capabilities

<!-- None: the existing sap-timesheet add/read transport is unchanged; the import
     reuses it in a later change. -->

## Impact

- New TUI dependencies (`@clack/prompts`, `picocolors`, `cli-table3`) and a CSV parser (`csv-parse`).
- New modules under `src/jira/` and `src/import/`, plus a new `import` npm script.
- `JIRA_EXPORT_DIR` added to `.env.example` and the README.
- `.gitignore` gains `csv-sample/` (or real exports move under the already-ignored `data/`).
- No change to `SapClient`, `buildEntryPayload`, or the existing `add`/`read` commands.
