# jira-sap-bridge

Small CLI with two operations against SAP CATS (`HCM_CATS_MANAG_V1`):

- `add` — create one time entry
- `read` — list existing entries for an employee and day/range

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Fill `.env` with the tenant URL and employee/entry defaults.

## Authentication

The script opens a Chromium window, you complete the tenant's SSO/MFA login,
and the run continues with that session. No cookie is copied.

The browser profile is kept in `.sap-browser-profile/` so the IdP session is
reused between monthly runs; the script only asks you to log in again when the
session has expired. Set `SAP_BROWSER_PROFILE` to use another directory.

## Commands

Create one entry from the `ENTRY_*` settings:

```bash
npm run timesheet -- add
```

Read entries for the configured `ENTRY_DATE` (one day):

```bash
npm run timesheet -- read
```

Read a range, or print JSON:

```bash
npm run timesheet -- read --from 2026-11-01 --to 2026-11-30
npm run timesheet -- read --json
```

## Monthly import (preview)

`npm run import` guides you through a monthly Jira export without writing to SAP.

- It scans `JIRA_EXPORT_DIR` (default `~/Downloads`) first for `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv` files, where the two dates are the first and last day of one calendar month.
- The picker lists each export found in the directory, newest month first, as the month name followed by the filename in brackets. Only files that match the pattern and span one full calendar month are listed.
- The file for the previous month is preselected on days 1–10 and the file for the current month on days 11–31, if they exist; otherwise the newest file is preselected.
- If no matching export is found, it reports the searched directory, asks you to download the monthly export from Tempo/Jira, and exits without showing a picker.

The preview only reads the export and prints the aggregated hours. It never contacts SAP.

```text
$ JIRA_EXPORT_DIR=csv-sample npm run import

┌  Jira hours -> SAP preview
│
◆  Which export are you filing?
│  ● November 2026 (User_ Muster-Lang Anna_2026-11-01_2026-11-30.csv)
│  ○ October 2026 (User_ Muster-Lang Anna_2026-10-01_2026-10-31.csv)
...
◇  Which export are you filing?
│  November 2026 (User_ Muster-Lang Anna_2026-11-01_2026-11-30.csv)
│
◇  Read 8 entries.
🗓  November 2026  2026-11-01 - 2026-11-30
Hi Anna 👋  (Muster-Lang Anna)  ·  8 entries across 2 days  ·  16 h total
...
└  Preview only. Nothing was sent to SAP.
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `S4_HOST` | Tenant base URL |
| `SAP_BROWSER_PROFILE` | Browser profile directory (default `.sap-browser-profile`) |
| `SAP_BROWSER_LOGIN_TIMEOUT_MS` | Login timeout (default 5 minutes) |
| `EMPLOYEE_ID` | SAP personnel number (`Pernr`) |
| `ENTRY_DATE` | Day to add, and default day to read |
| `ENTRY_HOURS` | Hours for the created entry |
| `ENTRY_PROFILE` | CATS data entry profile (`S4H_EXT`) |
| `ENTRY_NOTE` | Entry note |
| `ENTRY_EXTRA_DATA_FIELDS` | JSON assignment fields (PO, WBS, project, …) |
| `JIRA_EXPORT_DIR` | Directory searched for monthly Jira exports (default `~/Downloads`) |

## Behaviour

- `add` sends exactly one create request per run; it never updates or deletes.
- `read` is read-only and reports record ID, date, hours, status, and note.
- Non-2xx responses print the SAP status and error body and exit non-zero.
- Session writes fetch and reuse a CSRF token automatically.

## Development

```bash
npm test
npx tsc --noEmit
```
