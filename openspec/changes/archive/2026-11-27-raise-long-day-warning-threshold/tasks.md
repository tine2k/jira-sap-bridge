# Tasks

## 1. Threshold change

- [x] 1.1 Introduce a shared long-day threshold constant of 12 hours (720 minutes) and use it in `src/jira/preview.ts` for the long-day warning; verify a day of exactly 12 h produces no warning and a day of 12 h 1 min produces one.
- [x] 1.2 Update the long-day warning message to report the 12 h threshold instead of 8 h; verify the message reads "above a normal 12 h day".
- [x] 1.3 Use the same constant for the yellow day highlight in `src/import/summary.ts`; verify a day above 12 h renders yellow and a day at or below 12 h does not.

## 2. Tests

- [x] 2.1 Update `tests/summary.test.ts` to expect the 12 h wording and add cases at the 12 h boundary; verify `npm test` passes.
- [x] 2.2 Add or adjust preview warning tests for the 12 h boundary and the unchanged 24 h invalid-day warning; verify `npm test` passes.

## 3. Spec sync

- [x] 3.1 Confirm the delta in `specs/jira-timesheet-import/spec.md` matches the implemented behavior; verify `openspec validate raise-long-day-warning-threshold` passes.
