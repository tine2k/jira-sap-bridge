# sap-timesheet Specification

## Purpose

Add and read SAP CATS time entries for a single employee through the tenant's OData service.

## Requirements

### Requirement: Add a time entry

The tool SHALL create exactly one SAP time entry per invocation from the configured employee, date, hours, data entry profile, note, and accounting assignment, and SHALL report the generated record ID. It SHALL NOT update or delete entries. A request rejected for a missing CSRF token MAY be retried once.

#### Scenario: Entry created

- **WHEN** `add` runs with valid credentials and entry settings
- **THEN** exactly one create request is sent and the generated Counter is reported

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
