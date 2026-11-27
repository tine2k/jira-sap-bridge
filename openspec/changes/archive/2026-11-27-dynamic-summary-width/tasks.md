# Tasks

## 1. Width computation

- [x] 1.1 Verify how cli-table3 counts padding and borders in `colWidths`, and record the overhead in `src/import/summary.ts` as a named constant; verify with a quick render at a known width.
- [x] 1.2 Add an optional `width` to `RenderSummaryOptions`, defaulting to `process.stdout.columns` when it is a number and to 80 otherwise; verify a unit test covers both the default and an explicit width.

## 2. Dynamic Description column

- [x] 2.1 Replace the fixed `colWidths` with a Description width of `min(longest note, width - fixed columns - overhead)`, floored at 30; verify a test with a short note yields a compact table and a test with a long note at width 80 keeps the table within 80 columns.
- [x] 2.2 Verify with `tests/summary.test.ts` that existing assertions still pass with the 80-column fallback, and add a test that every rendered line is at most the configured width.

## 3. Integration check

- [x] 3.1 Run the import against `csv-sample/` in a TTY-sized terminal and in a piped run; verify the table fits the terminal width and piped output uses 80 columns.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
