# Proposal

## Why

The preview warns about any day above 8 hours, but a 12-hour threshold better matches how the team logs long working days. The current 8-hour warning flags days that are routinely and legitimately longer, which adds noise to every import preview.

## What Changes

- The "long day" warning threshold in the preview moves from more than 8 hours to more than 12 hours.
- The warning message changes from "above a normal 8 h day" to reference 12 h.
- The yellow highlight of day rows in the summary table uses the same 12-hour threshold, so the table and the warnings agree.
- The 24-hour "invalid day" warning is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `jira-timesheet-import`: the "Preview warnings" requirement changes the long-day threshold from eight hours to twelve hours, including its scenario.

## Impact

- `src/jira/preview.ts`: long-day threshold and warning message.
- `src/import/summary.ts`: yellow highlight threshold for day rows.
- `tests/summary.test.ts`: assertion on the "8 h day" warning text.
- `openspec/specs/jira-timesheet-import/spec.md`: updated via the delta spec for this change.
- No change to SAP interaction, parsing, or the 24-hour validation.
