# Design

## Context

`runImport` (`src/import/main.ts`) currently ends after `renderSummary` with a preview-only outro. The SAP side already exposes `obtainSessionCookie` (`src/sap/browser.ts`) and `SapClient.readEntries(employeeId, date)` (`src/sap/client.ts`), plus `loadConnectionConfig` / `loadEmployeeConfig` (`src/config.ts`). See `proposal.md` for motivation and the spec delta for observable behavior.

## Goals / Non-Goals

**Goals:**

- Run the comparison inside the existing import run, after the summary table and behind an explicit confirmation.
- Reuse the existing authentication, client, and configuration code without changing the `timesheet` CLI.
- Keep the run strictly read-only against SAP.

**Non-Goals:**

- Creating, updating, or deleting SAP entries.
- Removing or changing `npm run timesheet -- add|read`.
- Concurrent reads, caching, or a reusable month-range API in the client.
- Per-day SAP-versus-Jira diffs; the comparison reports month totals.

## Decisions

### 1. Gate the SAP step behind a clack confirm

After writing the summary, call `ui.confirm` (added to the `Ui` type) with a "Compare with SAP?" message. Cancelling or answering no prints the existing preview-only outro and returns `EXIT_OK`; this keeps the current behavior for users who only want the preview and matches the spec's no-request guarantee. The prompt lives in `runImport` so tests can inject `Ui`.

Alternative: always read SAP. Rejected because it would make every preview depend on a login and break the read-only guarantee.

### 2. Reuse per-day `readEntries` over the month

Iterate `enumerateDates(range.from, range.to)` and call `readEntries(employeeId, date)` exactly as `runRead` does. This reuses the tested OData filter and avoids adding a range query to the client for this change.

Alternative: one `$filter` with `WorkDate ge/le`. Rejected for now: it changes the client contract and tests for little benefit at 31 requests per month.

### 3. Sum `CATSHOURS` for every returned entry

Recorded hours are the sum of `TimeEntryDataFields.CATSHOURS` over all entries returned for the month, regardless of `Status`, mirroring the `read` command's displayed hours. Missing or non-numeric values are treated as 0. The planned side is `preview.totalHours` / `preview.entryCount`, so both numbers describe the same month.

Alternative: filter by status. Rejected because the import has no status policy yet, and hiding entries would understate what SAP holds.

### 4. Load SAP configuration when the comparison starts

Call `loadConnectionConfig` and `loadEmployeeConfig` only after confirmation. A missing `EMPLOYEE_ID` or `S4_HOST` therefore fails without opening a browser and without affecting the preview. Authentication then uses the persisted `.sap-browser-profile`, so a still-valid session needs no interaction.

### 5. Report comparison errors through the import's existing exit path

The comparison wraps its work in the same `try` as the rest of `main`, extending the catch to recognise `ConfigError`, `BrowserAuthError`, `SapRequestError`, and `SapTransportError` with the same messages the `timesheet` CLI prints. This keeps one error surface per command without exporting `reportError` from `src/cli.ts`.

### 6. Print a compact comparison block

After the read, write two lines: recorded hours with the SAP entry count, and planned hours with the preview entry count. Use the same color switch as the summary (TTY detection) and no table, because the data is two totals.

## Risks / Trade-offs

- [31 sequential GETs make the step slow on a large month] → Accept for now; the step is opt-in and bounded. A range query can replace it later without changing the spec.
- [Session expires or is rejected mid-read] → Surface `SapRequestError` with the status and body, exit non-zero; no writes to roll back.
- [`CATSHOURS` arrives as a string in an unexpected format] → Coerce with `Number`, treat non-finite values as 0, and keep the sum deterministic.
- [Dirty `.env` or an expired profile blocks the comparison] → The prompt already happened; report the configuration or login error and exit non-zero without writing.

## Migration Plan

No data or configuration migration. The new step is opt-in per run; rollback removes the prompt and comparison call and leaves the preview as it is today.
