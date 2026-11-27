# Proposal

## Why

The import currently proposes a month by calendar date and only then checks whether a matching export exists. When the user has not downloaded that month's export, the tool stops with a "no match" report even though other months' exports are sitting in the download folder. The user should only be offered months they can actually import, and should be told clearly what to download when nothing is there.

## What Changes

- Export discovery runs first: the tool scans the export directory (`JIRA_EXPORT_DIR`, default Downloads) for files named `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv` whose dates are the first and last day of one calendar month.
- The month choice lists only the months that have a matching export. The date-based default (previous month on days 1–10, current month on days 11–31) applies only when that month has an export; otherwise the most recent month with an export is the default.
- When no matching export exists at all, the tool reports the searched directory and asks the user to download the monthly export from Tempo/Jira, then produces no preview.
- Files that do not match the pattern, or whose dates do not span a full calendar month, are ignored.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `jira-timesheet-import`: the reporting month selection and export file discovery requirements change so that months are offered from the exports found in the export directory, and the no-export case asks the user to download from Tempo/Jira.

## Impact

- `src/jira/` discovery and month-selection code, and the CLI `import` prompt flow in `src/cli.ts`.
- `tests/discover.test.ts`, `tests/month.test.ts`, and `tests/import-config.test.ts` need updated scenarios.
- No change to SAP interaction, CSV parsing, aggregation, or the read-only preview guarantee.
