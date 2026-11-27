# Proposal

## Why

The import picker currently shows month labels with their date ranges (for example "November 2026 (2026-11-01 - 2026-11-30)") and then asks a second question when several exports match the month. The user works with the downloaded files, so the picker should show the exact filename they are choosing.

## What Changes

- The export picker lists the matching export filenames directly instead of month labels with date ranges. Only files that match the export pattern and span one full calendar month are offered.
- The default selection is the export for the date-based default month (previous month on days 1–10, current month on days 11–31) when such a file exists; otherwise the newest exported file is the default.
- The separate "which export for this month" prompt is removed, since each option is already a file.
- When no matching export exists, the tool still reports the searched directory, asks the user to download the monthly export from Tempo/Jira, and exits without offering any choice.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `jira-timesheet-import`: the reporting month selection requirement changes so that the choice is presented as export filenames, with the date-based default applied to the file for that month.

## Impact

- `src/import/main.ts`: the month prompt and the file prompt are replaced by one filename prompt.
- `src/import/discover.ts` and `src/import/month.ts`: discovery returns the matching files, and default selection works on them.
- `tests/discover.test.ts` and `tests/month.test.ts`: updated for filename options and default selection.
- `README.md`: the "Monthly import (preview)" section and the example output describe the filename picker.
- No change to SAP interaction, CSV parsing, aggregation, or the read-only preview guarantee.
