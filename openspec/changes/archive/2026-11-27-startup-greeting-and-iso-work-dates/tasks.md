# Tasks

## 1. Work date parsing

- [x] 1.1 Extend `parseWorkDate()` in `src/jira/fields.ts` to accept `YYYY-MM-DD` with an optional `H:mm` time, using the value as written; verify `2026-11-26 00:00` yields `2026-11-26` with no warning in `tests/fields.test.ts`.
- [x] 1.2 Keep `M/D/YY` resolution unchanged; verify the existing month/day and `Period` tests still pass via `npm test`.
- [x] 1.3 Reject invalid ISO values (for example `2026-13-01`) with the existing warning; verify in `tests/fields.test.ts`.
- [x] 1.4 Add a CSV fixture case with a mixed `M/D/YY` and ISO `Work date` column to `tests/csv.test.ts`; verify both rows are aggregated under the correct day.

## 2. Startup greeting

- [x] 2.1 In `runImport()` in `src/import/main.ts`, print `Hi <first name>` after `ui.intro` using the default-proposed export's first name from `firstNameFromName()`; print nothing when no export is offered.
- [x] 2.2 Verify with `tests/import-main.test.ts` using the injectable `Ui`: the greeting appears before the picker and uses the default export's name; no greeting when no export exists.
- [x] 2.3 Confirm the preview summary greeting in `src/import/summary.ts` is unchanged; verify with `tests/summary.test.ts`.

## 3. Verification

- [x] 3.1 Run `npm run typecheck` and `npm test`; both must pass.
- [x] 3.2 Run `JIRA_EXPORT_DIR=csv-sample npm run import` in a terminal and confirm the greeting appears on startup and the sample preview shows no warnings.
- [x] 3.3 Update the README import section if the startup transcript changes.
