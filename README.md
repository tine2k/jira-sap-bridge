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
