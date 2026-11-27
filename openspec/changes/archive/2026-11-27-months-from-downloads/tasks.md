# Tasks

## 1. Export scan

- [x] 1.1 In `src/import/discover.ts`, add a function that lists the export directory once and returns the distinct full-month ranges from matching filenames, newest first
- [x] 1.2 Ensure filenames whose dates are not the first and last day of one calendar month are skipped
- [x] 1.3 Tests in `tests/discover.test.ts`: valid months found, non-matching names ignored, partial-month ranges ignored, empty directory

## 2. Month selection

- [x] 2.1 In `src/import/main.ts`, run the scan before the month prompt and build the picker options only from offered months
- [x] 2.2 Set the default to `defaultMonth(today)` when offered, otherwise the newest offered month
- [x] 2.3 Remove the "Other month..." option and its prompt
- [x] 2.4 Tests in `tests/month.test.ts` and `tests/discover.test.ts`: default selection rules and offered-month list (`tests/import-config.test.ts` unchanged, since the config logic did not change)

## 3. No-export path

- [x] 3.1 When the scan finds no matching files, print the searched directory and ask the user to download the monthly export from Tempo/Jira, then exit without a preview
- [ ] 3.2 Test the no-export message and that no preview is produced

## 4. Documentation

- [x] 4.1 Update the "Monthly import (preview)" section of `README.md` to describe offered months and the download prompt

## 5. Verification

- [x] 5.1 Run `npm test` and `npx tsc --noEmit`
- [x] 5.2 Manually run `JIRA_EXPORT_DIR=csv-sample npm run import` and confirm only November 2026 is offered
