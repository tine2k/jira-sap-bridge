# Design

## Context

`renderSummary` in `src/import/summary.ts` builds the day table with cli-table3 and hard-coded `colWidths: [16, 8, 7, 60]` with `wordWrap: true`. Notes are capped at 255 characters by `NOTE_MAX_LENGTH` in `src/jira/aggregate.ts`. See proposal.md for motivation.

`src/import/main.ts` calls `renderSummary` with `color` set from `process.stdout.isTTY`. The width is not currently passed in.

## Goals / Non-Goals

**Goals:**
- Size the Description column from the terminal width at render time.
- Keep rows on one line when the terminal is wide enough for the longest note.

**Non-Goals:**
- Live re-layout on terminal resize.
- Changes to aggregation, note truncation, or warnings.
- Changes to the header lines or the warnings block.

## Decisions

- **Width source:** `process.stdout.columns` when it is a number; otherwise 80. Read once per render. Alternative: pass width through `RenderSummaryOptions` from `main.ts`. Preferred is an optional `width` option that defaults to the stdout value, so tests can pin it.
- **Description width:** `min(longestNoteLength, availableWidth)`, where `availableWidth` is the width minus the fixed columns (Day 16, Hours 8, Items 7) and cli-table3's border and padding overhead. Floor at 30. Capping at the longest note keeps short tables compact.
- **Overhead calculation:** Verify how cli-table3 counts padding in `colWidths` before coding, then derive the overhead from that rather than hard-coding a number.
- **Wrapping:** keep `wordWrap: true`. Rows wrap only when a note is longer than the computed width or the floor forces a narrower column.

## Risks / Trade-offs

- [Border/padding overhead is off by a few characters, causing overflow] → Verify with a test at a fixed width (e.g. 80) that every rendered line is at most that width.
- [Piped output with a non-80 terminal width differs from TTY output] → Accepted; non-TTY always uses 80.
- [Column computed at render time, stale after resize] → Accepted; the summary is printed once.
