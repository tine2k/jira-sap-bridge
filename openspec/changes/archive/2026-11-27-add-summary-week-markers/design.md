# Design

## Context

`renderSummary` in `src/import/summary.ts` renders chronologically sorted `preview.days` with cli-table3, dynamic column widths, and `wordWrap: true`. It then applies day-status colors to rendered rows. Only days with entries are present. See `proposal.md` and the modified `Preview summary` requirement for the observable behavior.

## Goals / Non-Goals

**Goals:**

- Detect boundaries from the ISO weeks of consecutive displayed dates, including when no Monday entry exists.
- Render a left-aligned, colorful week title before the first displayed day and at each week change without disturbing dynamic sizing or existing day colors.
- Reuse the renderer's existing color setting for the marker.

**Non-Goals:**

- Adding empty dates, weekly subtotals, or data to `Preview`.
- Configurable week starts, marker colors, or marker labels.
- Exporting a generally reusable week-number API before another caller needs one.

## Decisions

### 1. Use ISO week-year and week number as the boundary key

Add a private helper in `src/import/summary.ts` that validates the date with `parseCalendarDate` and uses UTC Thursday-based ISO week arithmetic. Return both the ISO week-year and week number; compare their composite key between consecutive day rows and use the upcoming row's week number in the label. UTC avoids local timezone drift, while including week-year handles December/January correctly.

Comparing week keys is preferable to inserting only before Monday rows: a week can begin with a Tuesday or later in exports with missing days. Keeping the helper local avoids expanding `src/date.ts` for a single presentation concern.

### 2. Insert spanning cli-table3 rows before the first day and at week changes

While appending day rows, compare each date's week key with the previous displayed date. Before the first row, and before any row whose key differs, append a single cell with `colSpan: 4`. The existing total row is appended only after the loop, so no marker follows the final day.

A spanning row keeps table borders and column sizing under cli-table3's control. Post-processing the rendered table to insert lines was rejected because it would have to duplicate border-width and ANSI-aware layout logic.

### 3. Left-align a colorful title in a blank spanning row

Build the marker content as a bold cyan `Week <n>` title followed by spaces, with no horizontal rule. Reuse the computed `colWidths`: the spanning cell's drawable content width is the sum of all column widths, plus the three internal column borders reclaimed by the span, minus left and right cell padding. The trailing spaces keep the row visually empty apart from the title.

Set `wordWrap: false` on the marker cell. cli-table3's wrapping calculation for a spanning cell excludes the reclaimed internal-border widths, which otherwise wraps a line sized for the actual drawable width. Normal day and total rows retain table-level word wrapping.

Cyan distinguishes the title from green/yellow/red/magenta day states. The existing `color: false` option produces the same spaced layout without ANSI styling.

### 4. Leave existing row coloring unchanged

The current post-processing only recognizes rows whose split cells match a day label, `TOTAL`, or the header. A spanning marker has only outer vertical borders and already contains its intended styling, so it passes through unchanged. No day-status lookup or warning logic needs to change.

## Risks / Trade-offs

- [ANSI codes or spanning-cell spacing produce an extra line or overflow] → Disable wrapping only for the marker and test visible line lengths with ANSI stripped at narrow and wide explicit widths.
- [Year-boundary dates receive the wrong label or are split incorrectly] → Include the ISO week-year in the comparison key and cover 2027-01-01 to 2027-01-04.
- [A missing Monday suppresses a boundary] → Compare consecutive dates' week keys and test a Friday-to-Tuesday transition.
- [A hard-coded cyan title reduces configurability] → Accept for this focused visual change; use the existing color switch so plain output remains supported.

## Migration Plan

No data, configuration, or API migration is required. Rollback consists of reverting the renderer and its tests; previously generated previews contain no persisted state.
