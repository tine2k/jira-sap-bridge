# Design

## Context

See `proposal.md` — Why.

The repository is a small Node 22 / TypeScript CLI (`tsx`, strict mode, `node:test`) with an existing SAP transport layer:

- `src/sap/client.ts` posts one entry per call and retries once on a missing CSRF token.
- `src/sap/entry.ts` already builds a payload from a per-entry `AddEntryConfig` (date, hours, note, shared accounting fields).
- `src/date.ts` treats calendar dates as `YYYY-MM-DD` strings and never routes a day through a local `Date` instant.
- `src/cli.ts` is a thin command dispatcher; errors are reported through one `reportError` function.

There is no TUI, no CSV dependency, and no import workflow yet. The real export (`csv-sample/User_ Maier-Moessner Martin_2026-11-01_2026-11-30.csv`) is UTF-8/CRLF, has 33 columns, uses `M/D/YY H:mm` work dates, decimal hours, quoted commas, doubled quotes, and 61 trailing comma-only rows.

This change is preview-only. It must be impossible for it to post to SAP.

## Goals / Non-Goals

**Goals:**

- A linear guided flow: month → file → person → preview.
- Pure, deterministic parsing and aggregation that can be tested without a terminal.
- Reuse `src/date.ts` for calendar arithmetic.
- Surface every questionable input in the preview instead of failing silently.
- Keep the existing `add`/`read` commands and the SAP client untouched.

**Non-Goals:**

- Any SAP write, duplicate detection against SAP, or confirmation step.
- Full-screen terminal UI, mouse input, or persistent dashboards.
- `.xlsx` input.
- Batch import of multiple months at once.

## Decisions

### 1. TUI: `@clack/prompts` + `picocolors` + `cli-table3`

The flow is a short sequence of discrete prompts, not a persistent full-screen app.

- **Chosen:** Clack for `select`/`text`/`confirm`/`spinner`, `picocolors` for emphasis, `cli-table3` for the summary.
- **Alternatives:** Ink (React reconciler, much larger dependency and a different authoring model), `blessed` (full-screen, overkill and awkward under `tsx`), raw `readline` (no selection UI or styling).
- **Rationale:** smallest dependency surface that still looks like a polished TUI, and it degrades predictably when the process is not a TTY.

### 2. CSV: `csv-parse`

Hand-rolled splitting breaks on the real export (`Daily, Refinement, UI JX`, `""SVD Bearbeitung""`).

- **Chosen:** `csv-parse` with `bom: true`, `columns: true`, `relax_column_count: true`, `skip_empty_lines: true`, then an explicit blank-row filter.
- **Alternatives:** `papaparse` (browser-first API), manual state machine (reinvents RFC 4180 and its edge cases).
- **Rationale:** mature RFC 4180 handling, streaming, and no surprise about quotes or CRLF.

### 3. Module split: pure domain vs. orchestration

```
src/
  jira/
    types.ts        RawRow, DayEntry, Preview, Warning
    filename.ts     parseExportFilename()
    csv.ts          readExport() -> RawRow[]
    aggregate.ts    aggregateDays() -> DayEntry[]
  import/
    month.ts        defaultMonth(), monthRange()
    discover.ts     findExports(dir, range)
    summary.ts      renderSummary() / collectWarnings()
    main.ts         Clack flow, exit codes
```

- **Chosen:** parsing and aggregation are pure functions taking data and an injected `today`/`dir`.
- **Alternative:** one large `main.ts` that reads, prompts, and prints.
- **Rationale:** the risky logic (dates, hours, grouping) is testable with plain fixtures; the TUI stays a thin shell, matching how `entry.ts` and `date.ts` are already separated from `cli.ts`.

### 4. Month default: injected clock, cutoff day 10

`defaultMonth({ year, month, day })` returns the previous month when `day <= 10`, otherwise the current month. Year boundaries are handled explicitly (`January -> December of year - 1`). The cutoff is configurable later via `JIRA_MONTH_CUTOFF_DAY`, but the function always accepts an injected date so tests never depend on the wall clock.

- **Alternative:** default to the newest matching file. Rejected because the user explicitly wants month first, and an old export could be the only match.

### 5. Date parsing: explicit format + context disambiguation

`Work date` is matched as `M/D/YY` with optional `H:mm`, then reconstructed as `YYYY-MM-DD` through `date.ts`. No `new Date("11/2/26")` — that is locale- and timezone-dependent.

Disambiguation order:

1. Parse month-first. If the result falls inside the selected month, accept it.
2. Otherwise parse day-first. If that falls inside the month, accept it.
3. Otherwise report the row as out of range and exclude it.

`Period` (e.g. `1126` = November 2026) is a second cross-check and produces a warning when it disagrees with the selected month.

### 6. Hour arithmetic: integer minutes

`Hours` is parsed as a decimal string and converted to integer minutes (`Math.round(hours * 60)`). Days sum in minutes, then format back to a decimal string with at most two places. This avoids `0.1 + 0.2` drift and guarantees the string sent to SAP is stable.

- **Alternative:** sum floats and `toFixed(2)`. Simpler, but the rounding happens after the error is introduced.

### 7. Aggregation: group by key inside the day

For each day:

```
entries grouped by Issue Key
  -> descriptions joined with ", "
  -> key rendered as "KEY: descriptions"
  -> keys joined with "; "
```

This collapses repeated `Daily`/`Refinement` rows for the same issue and keeps the SAP note readable. Issue keys preserve first-seen order rather than sorting, so the note follows the export.

### 8. Note length: cap and warn

The aggregated note is capped at the SAP `LTXA1` limit (255 characters) and truncated on a segment boundary. The preview reports truncation and the affected keys. Splitting into multiple SAP entries per day is deliberately deferred to the write phase, where the entry granularity is decided.

### 9. Discovery: exact range, never guess

The filename is parsed from the right: optional `User_` prefix, then `<name>`, then `_<from>_<to>.csv`. Both dates must equal the selected month's first and last day. Zero matches is an error naming the directory and pattern; more than one match is a picker.

- **Alternative:** match only on month. Rejected because a file named for a different range (e.g. a sprint export) would be silently accepted.

### 10. Preview is a data structure first, text second

`buildPreview(rawRows, context)` returns the month, person, day entries, total, and warnings. `renderSummary(preview)` only turns that into color and a table. This keeps the color/emoji layer replaceable and lets a later change reuse the exact same preview for a confirm prompt.

### 11. Phase-2 readiness

`DayEntry` carries `{ date, hours, note }`, which maps directly onto `AddEntryConfig`. The later write change can call `buildEntryPayload({ ...connectionConfig, ...entryConfig, entryDate, entryHours, note })` per day and `SapClient.addEntry`, with no change to the transport. `ENTRY_PROFILE` and `ENTRY_EXTRA_DATA_FIELDS` remain the shared assignment source; `ENTRY_DATE`, `ENTRY_HOURS`, and `ENTRY_NOTE` become irrelevant for import.

## Risks / Trade-offs

- **Date ambiguity** (`11/2/26`): resolved by month range + `Period`; if neither reading fits, the row is warned and excluded rather than guessed. → Mitigation: scenario tests for both readings.
- **Silent truncation of long notes**: a busy month can exceed 255 characters. → Mitigation: truncate on a segment boundary and list affected keys in the preview; revisit entry granularity in phase 2.
- **Partial exports**: the sample covers only two days of a month. → Mitigation: report "days with entries" instead of assuming a full month, and never warn merely because other days are absent.
- **Real names and issue keys in fixtures**: `csv-sample/` is currently untracked but not ignored. → Mitigation: add it to `.gitignore` (or move real exports under the already-ignored `data/`); commit only a redacted `data/timesheet.example.csv`.
- **Terminal capability**: Clack output under a non-TTY (CI, piped) can hang or look wrong. → Mitigation: detect `process.stdout.isTTY` and fail with a clear message instead of prompting; a `--dry-run`/non-interactive mode can follow.
- **Float drift in sums**: mitigated by integer minutes.
- **Duplicate SAP entries in phase 2**: out of scope here, but the preview's per-day shape makes a pre-read against `readEntries` straightforward.

## Migration Plan

- Add dependencies and the `import` npm script; no existing script changes behaviour.
- Add `JIRA_EXPORT_DIR` to `.env.example` and the README; the default keeps current setups working.
- Rollback is deleting `src/jira/`, `src/import/`, the script, and the env documentation — the SAP client and specs are untouched.

## Open Questions

- Confirm the exact SAP `LTXA1` length limit in the write phase; 255 is the current assumption and only affects when truncation starts.
- Decide in the write phase whether SAP gets one entry per day or one per issue key; the preview already groups by key, so either is derivable.
