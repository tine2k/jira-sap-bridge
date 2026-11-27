# Proposal

## Why

A monthly import preview contains many visually similar day rows, making it difficult to scan the table by working week. Clear week boundaries would make the existing review step faster without changing the imported data.

## What Changes

- Insert a blank separator row before the first displayed day and between consecutive day rows that belong to different Monday-based ISO calendar weeks.
- Left-align a colored `Week <ISO week number>` title in each separator row and use blank space instead of a horizontal rule.
- Do not add a separator between days in the same week, after the last day, or between the final day and the total row.
- Preserve the existing day rows, ordering, totals, warnings, colors, and dynamic table width; days without entries remain omitted.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `jira-timesheet-import`: the preview summary requirement gains Monday-based ISO week markers between displayed day rows.

## Impact

- `src/import/summary.ts`: add week-boundary detection and render centered, colorful week-title rows.
- `tests/summary.test.ts`: cover week labels, separator placement, coloring, and unchanged width behavior.
- No changes to CSV parsing, aggregation, totals, warnings, SAP interaction, or external dependencies.
