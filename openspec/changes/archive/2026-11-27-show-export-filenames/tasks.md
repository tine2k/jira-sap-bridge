# Tasks

## 1. Discovery

- [x] 1.1 In `src/import/discover.ts`, add a function that lists the export directory once and returns the matching full-month exports, newest first
- [x] 1.2 Tests in `tests/discover.test.ts`: matching files returned, non-matching and partial-month names ignored, empty directory returns no files

## 2. Picker

- [x] 2.1 In `src/import/main.ts`, replace the month prompt and the second file prompt with one prompt whose options are the export filenames
- [x] 2.2 Set the initial value to the file for the date-based default month, otherwise the newest file
- [x] 2.3 Remove `monthOptions`/`chooseMonth` and any month-label code that becomes unused, keeping `src/import/month.ts` default logic
- [x] 2.4 Tests in `tests/month.test.ts`: default file selection rules

## 3. No-export path

- [x] 3.1 When no matching files exist, print the searched directory and the download prompt, then exit without showing a picker
- [x] 3.2 Test that the no-export message is shown and no preview is produced (`tests/import-main.test.ts`)

## 4. Documentation

- [x] 4.1 Update the "Monthly import (preview)" section and example output in `README.md` to show the filename picker

## 5. Verification

- [x] 5.1 Run `npm test` and `npx tsc --noEmit`
- [x] 5.2 Confirm `JIRA_EXPORT_DIR=csv-sample` offers only `User_ Maier-Moessner Martin_2026-11-01_2026-11-30.csv` as `November 2026 (<filename>)` and previews it (`tests/import-main.test.ts`; the interactive terminal run itself is not automated)
