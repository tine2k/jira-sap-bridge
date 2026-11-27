# Proposal

## Why

The import preview's day table has a fixed Description column of 60 characters. On wide terminals it wraps early and leaves space unused, and on narrow terminals it can overflow. Most day notes would fit on one line if the table used the available width.

## What Changes

- The preview day table sizes its Description column to the terminal width instead of a fixed 60 characters.
- The Description column is capped at the longest note in the table, so short tables do not stretch to the full terminal width.
- The Description column has a minimum width of 30 characters; below that, the table wraps as before.
- When the output is not a TTY (piped output, tests), the table uses an 80-column width.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
<!-- None. Display-only change; no spec-level behavior changes. -->

## Impact

- `src/import/summary.ts`: column widths computed from terminal width instead of the hard-coded `colWidths`.
- `tests/summary.test.ts`: existing assertions should keep passing at the 80-column fallback.
- No changes to data, aggregation, warnings, or the SAP flow.
