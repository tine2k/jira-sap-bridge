# Tasks

## 1. Month comparison module

- [x] 1.1 Add a pure aggregation helper for a month's SAP entries that sums `TimeEntryDataFields.CATSHOURS`, treating missing or non-numeric values as 0, and pairs it with the preview totals; verify `tests/sap-compare.test.ts` covers normal sums, an empty month, string values, and malformed values.
- [x] 1.2 Add the comparison orchestration that loads the connection and employee configuration, obtains the browser session, enumerates the selected month's days, and reads each day through `SapClient.readEntries`; verify with an injected session provider and reader that the requested dates are the month's first through last day and the session cookie reaches the client.
- [x] 1.3 Keep the comparison strictly read-only and export its result as recorded hours, recorded entry count, planned hours, and planned entry count; verify no add/update/delete call exists in the module and the returned counts match the injected entries.

## 2. Import flow integration

- [x] 2.1 Add `confirm` to the import `Ui` type and ask "Compare with SAP?" after the summary; verify a declined or cancelled prompt prints the preview-only outro, returns success, and makes no comparison call.
- [x] 2.2 Run the comparison when confirmed and print the recorded and planned hours with their entry counts; verify `tests/import-main.test.ts` asserts both lines for a month with and without recorded SAP hours.
- [x] 2.3 Recognise `ConfigError`, `BrowserAuthError`, `SapRequestError`, and `SapTransportError` in the import error path and exit non-zero with the `timesheet` CLI's message wording; verify tests for each error type and for a missing `EMPLOYEE_ID`.

## 3. Documentation and integration check

- [x] 3.1 Update `README.md` so the monthly import section describes the confirmation, the SAP read, and the recorded-versus-planned output, and states that nothing is written to SAP; verify every documented command matches `package.json` and the usage text.
- [x] 3.2 Run `npm test`, `npm run typecheck`, and `openspec validate compare-import-with-sap --type change --strict`; verify all pass and the change touches only the import flow, the new module, its tests, the README, and this change's artifacts.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
