# Design

## Context

The 8-hour long-day threshold is hard-coded in two places: the warning generator in `src/jira/preview.ts` and the day-row highlight in `src/import/summary.ts`. The warning text in `preview.ts` names the threshold literally ("above a normal 8 h day"). The 24-hour invalid-day threshold is separate and stays as is. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Long-day warnings fire only for days above 12 hours.
- The yellow day highlight and the long-day warning use the same threshold.

**Non-Goals:**
- No change to the 24-hour invalid-day rule, parsing, aggregation, or SAP behavior.
- No user-configurable threshold; the value is a constant.

## Decisions

- **Single constant for the threshold.** Replace the literal `8 * 60` in both files with one shared constant (for example, exported from `src/jira/preview.ts`) so the warning and highlight cannot drift apart. Alternative: change both literals in place. Rejected because it repeats the same drift risk that exists today.
- **Message uses the threshold value.** The warning text states "12 h" derived from the constant rather than a hard-coded string, so the message stays correct if the value changes again.
- **Highlight follows the warning.** The yellow highlight moves to 12 hours. Assumption: the highlight is meant to mirror the long-day warning. If it should stay at 8 hours as a softer cue, this decision changes.

## Risks / Trade-offs

- [Highlight change is an assumption] → Called out in the proposal; reviewer can confirm before apply.
- [Existing test asserts the old "8 h day" text] → Update `tests/summary.test.ts` to the new wording in the same change.
