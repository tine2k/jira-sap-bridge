# Proposal

## Why

Some rows in a real Jira export write `Work date` in ISO form (`2026-11-26 00:00`) rather than the `M/D/YY H:mm` form the parser expects. The parser rejects those rows with a warning and drops their hours from the preview, so the day totals are wrong. Separately, the greeting only appears after an export is picked and the preview is rendered, so the user is not greeted when the tool starts.

## What Changes

- Accept `Work date` values in ISO form `YYYY-MM-DD` with an optional `H:mm` time, in addition to the existing month-first `M/D/YY` form. ISO values are unambiguous and need no month/day resolution.
- Greet the user by first name on startup: print `Hi <first name>` directly under the intro line, before the export picker. The name comes from the export file proposed as the default (the same file the picker preselects). When no export exists, no greeting is printed.
- The existing greeting in the preview summary is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `jira-timesheet-import`: the work date interpretation accepts ISO dates, and the person identity requirement adds a startup greeting that uses the default export's first name.

## Impact

- `src/jira/fields.ts`: `parseWorkDate` and its pattern gain the ISO form.
- `src/import/main.ts`: `runImport` prints the greeting after the intro, using the default-proposed export. The default is computed before the picker, so no extra prompt is added.
- `src/import/summary.ts`: no change.
- Tests in `tests/csv.test.ts`, `tests/fields.test.ts`, and `tests/import-main.test.ts`.
- No SAP, aggregation, or dependency changes. Read-only preview guarantee unchanged.
