# Tasks

## 1. Setup

- [x] 1.1 Add `@clack/prompts`, `picocolors`, `cli-table3`, and `csv-parse` to `package.json`, and add an `import` script that runs `tsx src/import/main.ts`; verify with `npm install` and `npm run typecheck`.
- [x] 1.2 Document `JIRA_EXPORT_DIR` (default `~/Downloads`) in `.env.example` and `README.md`; verify the documented default matches the implementation task in group 3.
- [x] 1.3 Add `csv-sample/` to `.gitignore` (or move real exports under the already-ignored `data/`); verify with `git check-ignore -v "csv-sample/<export>.csv"`.

## 2. Filename and month logic

- [x] 2.1 Implement `parseExportFilename()` in `src/jira/filename.ts` for `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`, including names with spaces and underscores; verify with tests for the real sample name, a name containing `_`, and invalid names via `npm test`.
- [x] 2.2 Implement `defaultMonth()` and `monthRange()` in `src/import/month.ts` with an injected `{ year, month, day }`; verify tests for days 1–10, days 11–31, January → previous December, and December → previous November via `npm test`.

## 3. Export discovery and configuration

- [x] 3.1 Implement `findExports(dir, range)` in `src/import/discover.ts` using `parseExportFilename()` and an exact first/last-day date match; verify tests for zero, one, and multiple matches in a temporary directory via `npm test`.
- [x] 3.2 Implement export-directory resolution from `JIRA_EXPORT_DIR`, defaulting to `~/Downloads` and expanding a leading `~`; verify tests for default, override, and `~` expansion via `npm test`.
- [x] 3.3 Document the discovery rules and the zero/many-match behaviour in `README.md`; verify the documented example filename matches the sample in `csv-sample/`.

## 4. CSV parsing

- [x] 4.1 Implement `readExport()` in `src/jira/csv.ts` with `csv-parse` (`bom`, `columns`, quoted fields, CRLF) and skip comma-only rows; verify with tests covering embedded commas, doubled quotes, CRLF, and the 61 trailing blank rows from the sample.
- [x] 4.2 Add header validation for `Issue Key`, `Hours`, and `Work date`; verify a missing-column fixture fails with a message naming the column.
- [x] 4.3 Implement `M/D/YY[ H:mm]` work-date parsing with month-first/day-first disambiguation against the selected month and `Period`; verify tests for `11/2/26 0:00`, an ambiguous `2/11/26`, and an out-of-month date.
- [x] 4.4 Implement `Hours` parsing to integer minutes and exclude zero/negative/unparseable rows with a warning; verify tests for `3`, `1.5`, `0.5`, `abc`, and `0`.
- [x] 4.5 Add a redacted fixture at `data/timesheet.example.csv` (allowed by the existing `.gitignore` exception) and use it in tests; verify no real names or issue keys are committed.

## 5. Daily aggregation

- [x] 5.1 Implement `aggregateDays()` in `src/jira/aggregate.ts` to group by calendar date, sum minutes, group by `Issue Key`, and join descriptions as `KEY: d1, d2; KEY2: d`; verify the sample's Nov 2 (4 entries, 7 h) and Nov 3 (4 entries, 9 h) results via `npm test`.
- [x] 5.2 Fall back to `Issue summary` when `Work Description` is empty, and preserve first-seen issue-key order; verify with a fixture containing a blank description.
- [x] 5.3 Cap the aggregated note at 255 characters on a segment boundary and report which keys were truncated; verify the cap and the affected-key list via `npm test`.

## 6. Preview and warnings

- [x] 6.1 Implement `buildPreview()` in `src/jira/preview.ts` returning month, person, day entries, total hours, entry count, and warnings; verify totals for the sample (8 entries, 16 h, 2 days) via `npm test`.
- [x] 6.2 Add warnings for weekend entries, days above 8 h, days above 24 h, dates outside the selected month, filename/CSV name mismatch, and period mismatch; verify each warning with a focused fixture.
- [x] 6.3 Implement `renderSummary()` in `src/import/summary.ts` with `picocolors` and `cli-table3`, including the greeting, per-day rows, total row, and warning section; verify the rendered text (ANSI stripped) contains the expected days and totals.
- [x] 6.4 Handle an export with zero data rows by reporting that no hours were found and rendering no day table; verify with an empty fixture.

## 7. TUI flow and integration

- [x] 7.1 Implement the Clack flow in `src/import/main.ts`: month selection → discovery → preview → exit, with clear exit codes on cancel, no match, and parse failure; verify manually with `JIRA_EXPORT_DIR=csv-sample npm run import`.
- [x] 7.2 Detect a non-TTY stdout and exit with a clear message instead of prompting; verify by running the command with output piped.
- [x] 7.3 Verify the preview path never touches SAP: `grep -R "sap/" src/import src/jira` returns no runtime import, and `npm test` passes with no network access.
- [x] 7.4 Add a `README.md` section for `npm run import` with a short sample transcript; verify the commands run as written against `csv-sample/`.
- [x] 7.5 Run the full `npm test` and `npm run typecheck` suites; verify both pass.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Open a separate change for the SAP write phase (confirm, pre-read existing days, one entry per day, per-day result reporting).
