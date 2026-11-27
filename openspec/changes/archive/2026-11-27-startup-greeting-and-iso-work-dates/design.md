# Design

## Context

`parseWorkDate` in `src/jira/fields.ts` matches a single pattern, `M/D/YY` with an optional time. A row written as `2026-11-26 00:00` fails that pattern and becomes a warning. `runImport` in `src/import/main.ts` prints the intro before it lists exports, and `renderSummary` is the only place that greets. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Parse ISO work dates without changing how `M/D/YY` values resolve.
- Greet on startup with the default export's first name.

**Non-Goals:**
- Changing month/day disambiguation for the month-first form.
- Reading the greeting name from the CSV `Full name` column. The filename is the source already used for identity.
- Changing the preview summary greeting.

## Decisions

**Extend the existing pattern rather than add a second parser.** The ISO form is matched by a second regex inside `parseWorkDate`, which then builds the same `YYYY-MM-DD` candidate list. Alternative: a separate date-normalization step in `csv.ts`. Rejected because the outside-month and `Period` logic already lives in `parseWorkDate`, and duplicating it would drift.

**ISO dates are not resolved against the month.** Year, month, and day come directly from the value, so the candidate list has one entry. The existing outside-month flag still applies.

**Greeting uses the default-proposed export.** The default is already computed by `chooseExport` via `pickDefaultMonth`. Printing the greeting from the same file keeps startup from prompting for anything extra. Alternative: greet after picking. Rejected by the user in favour of a startup greeting.

**Greeting printed with `ui.log.message`-style output after `ui.intro`.** This keeps the Clack layout consistent and lets tests capture it through the existing injectable `Ui`.

## Risks / Trade-offs

- [Several exports from different people] → The greeting uses the default export only. This matches the single-person usage the tool is built for. Mitigation: the default is shown in the picker, so a mismatch is visible.
- [A malformed ISO value such as `2026-13-01`] → The existing `buildDate` validation rejects it, and the row is warned about as before.

## Migration Plan

No data migration. Ship with the next run. Rollback is reverting the two source files.

## Open Questions

None.
