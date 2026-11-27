# sap-timesheet Specification

## Purpose

Add and read SAP CATS time entries for a single employee through the tenant's OData service, authenticating interactively through a browser.

## Requirements

### Requirement: Interactive authentication

The tool SHALL open a real browser for the user to complete the tenant's SSO/MFA login, verify the resulting session against the service, and reuse it for the requested `add` or `read` operation. It SHALL NOT require a manually copied cookie.

#### Scenario: First login succeeds

- **WHEN** `add` or `read` runs and the user completes the SSO/MFA login
- **THEN** the tool verifies the session against the service metadata and continues with the requested operation

#### Scenario: Existing session is reused

- **WHEN** the persistent browser profile still holds a valid session
- **THEN** the tool proceeds without prompting for credentials

#### Scenario: Login is not completed

- **WHEN** the login is not completed within `SAP_BROWSER_LOGIN_TIMEOUT_MS` (default five minutes)
- **THEN** the tool reports the timeout, exits non-zero, and performs no add or read

#### Scenario: Browser is unavailable

- **WHEN** Chromium cannot be launched
- **THEN** the tool reports that Chromium must be installed with `npx playwright install chromium` and performs no add or read

### Requirement: Browser session handling

The tool SHALL use the authenticated session only in memory for the run and SHALL NOT write the session cookie to `.env` or any other project file. The only persisted login state SHALL be the browser profile, stored in `.sap-browser-profile` by default and overridable with `SAP_BROWSER_PROFILE`.

#### Scenario: No cookie is written to the project

- **WHEN** browser login completes
- **THEN** no session cookie is written to a project file and the browser profile directory is gitignored

#### Scenario: Custom profile location

- **WHEN** `SAP_BROWSER_PROFILE` is set
- **THEN** the tool stores and reuses the login state in that directory

### Requirement: Add a time entry

The tool SHALL create exactly one SAP time entry per invocation from the configured employee, date, hours, data entry profile, note, and accounting assignment, and SHALL report the generated record ID. It SHALL NOT update or delete entries. A request rejected for a missing CSRF token MAY be retried once.

#### Scenario: Entry created

- **WHEN** `add` runs with a valid session and complete entry settings
- **THEN** exactly one entry is created and the generated Counter is reported

#### Scenario: SAP rejects the entry

- **WHEN** SAP responds with a non-2xx status
- **THEN** the tool reports the status and SAP error body, exits non-zero, and does not report a Counter

#### Scenario: Missing configuration

- **WHEN** a required setting such as `EMPLOYEE_ID`, `ENTRY_DATE`, or `ENTRY_HOURS` is absent
- **THEN** the tool fails before any network call and names the missing setting

### Requirement: Read existing entries

The tool SHALL read the employee's time entries for a requested day or inclusive date range and SHALL report each entry's record ID, date, hours, status, and note. It SHALL NOT modify the entries it reads.

#### Scenario: Entries exist

- **WHEN** `read` requests a day that has entries
- **THEN** each entry's Counter, WorkDate, hours, Status, and note is reported

#### Scenario: No entries

- **WHEN** the requested dates contain no entries
- **THEN** the tool reports that no entries were found

#### Scenario: Read rejected

- **WHEN** SAP rejects the read request
- **THEN** the tool reports the status and SAP error body and exits non-zero
