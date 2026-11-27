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

- It proposes the previous month on days 1–10 and the current month on days 11–31; you can choose another month.
- It searches `JIRA_EXPORT_DIR` (default `~/Downloads`) for `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`, where the two dates are the first and last day of the selected month.
- Exactly one match is used automatically. No match reports the searched directory and expected range. Several matches open a picker.

The preview only reads the export and prints the aggregated hours. It never contacts SAP.

```text
$ JIRA_EXPORT_DIR=csv-sample npm run import

┌  Jira hours -> SAP preview
│
◆  Which month are you filing?
│  ● November 2026 (2026-11-01 - 2026-11-30)
│  ○ October 2026
...
◇  Which month are you filing?
│  November 2026
│
●  Using User_ Muster-Lang Anna_2026-11-01_2026-11-30.csv
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
