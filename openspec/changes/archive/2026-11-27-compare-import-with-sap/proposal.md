# Proposal

## Why

Today the monthly import stops at the Jira preview, and checking what SAP already holds means running a second command by hand. The comparison belongs in the import so the user sees recorded versus planned hours in one run before deciding to file anything.

## What Changes

- After the preview table, ask whether to continue to SAP; declining keeps the current preview-only exit.
- On confirmation, authenticate with the existing browser session flow and read the employee's CATS entries for the selected export month.
- Print how many hours SAP already records for that month and how many the import would insert, including the entry counts, then exit without writing to SAP.
- Report authentication, configuration, and SAP request failures as errors and exit non-zero.
- Keep the standalone `npm run timesheet` commands and the existing preview behavior unchanged for now; nothing is removed in this change.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `jira-timesheet-import`: the preview gains an opt-in SAP comparison, and its read-only guarantee changes from "no SAP request" to "no SAP write".

## Impact

- `src/import/main.ts`: add the proceed prompt and the SAP comparison step.
- New import module (for example `src/import/sap-compare.ts`): obtain the session, read the month, and compute recorded versus planned hours.
- `src/config.ts` and `src/sap/`: reused as-is; `EMPLOYEE_ID` and the `S4_*` connection settings become required for the comparison step.
- `tests/`: cover the prompt branch, the recorded/planned totals, and the failure exits.
- `README.md`: document the new step and the read-only comparison.
- No dependencies, no SAP writes, and no changes to the `timesheet` CLI.
