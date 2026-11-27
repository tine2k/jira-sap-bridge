# Design

## Context

`src/import/main.ts` builds the month picker from the last 12 months by calendar date, adds an "Other month..." entry, and only calls `findExports` (`src/import/discover.ts`) after a month is chosen. The result is that the user can pick months with no export and gets a "no export" message at the end. `discover.ts` already matches files by the selected month's exact date range; `month.ts` already computes `defaultMonth` and `monthRange`.

## Goals / Non-Goals

**Goals:**
- Scan the export directory once, before the month prompt, and derive the offered months from the filenames that match the pattern.
- Keep the existing per-month matching, candidate picker, and read-only preview unchanged.

**Non-Goals:**
- Changing CSV parsing, aggregation, warnings, or the SAP interaction.
- Reading export contents to decide months; the filename is the only source.

## Decisions

- **Scan first, then choose.** A new function in `discover.ts` lists the directory and returns the distinct full-month ranges found in matching filenames, sorted newest first. The month prompt is built from that list instead of `monthOptions`. Alternative considered: keep the 12-month list and grey out empty months. Rejected because the user asked that only exported months be proposed.
- **Default month.** `defaultMonth(today)` is used when it is in the offered list; otherwise the newest offered month. This keeps the day 1–10 / 11–31 rule meaningful when both months exist.
- **Remove "Other month...".** Typed months would reintroduce the no-export case. A user who needs an older month downloads or renames the export; the prompt directs them to Tempo/Jira.
- **No export.** `main.ts` prints the searched directory and a message asking the user to download the monthly export from Tempo/Jira, then exits without a preview. This replaces the current per-month "No export for ..." message.
- **Filename validation.** A file counts only if it matches `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv` and the two dates are the first and last day of the same calendar month; anything else is skipped silently.

## Risks / Trade-offs

- A file with a valid name but corrupt contents will still appear as a month → the existing parse warnings and preview handle it; no new handling.
- Reading the directory on each run is cheap; no caching is needed.
