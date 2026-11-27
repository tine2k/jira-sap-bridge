# Spec Delta

## Purpose

Turns a monthly Jira CSV export into a reviewed, per-day picture of worked hours so the user can confirm what will be recorded before anything is sent to SAP.

## ADDED Requirements

### Requirement: Reporting month selection

The tool SHALL begin by asking for the reporting month. It SHALL default to the previous month on calendar days 1–10 and to the current month on days 11–31, and SHALL let the user choose a different month before continuing.

#### Scenario: Default at the start of a month

- **WHEN** the tool starts on a calendar day between 1 and 10
- **THEN** the previous month is proposed as the default reporting month

#### Scenario: Default later in a month

- **WHEN** the tool starts on a calendar day between 11 and 31
- **THEN** the current month is proposed as the default reporting month

#### Scenario: User chooses another month

- **WHEN** the user selects a month other than the proposed default
- **THEN** discovery and parsing use the first through last calendar day of the chosen month

### Requirement: Export file discovery

The tool SHALL search a configured export directory for a CSV whose filename ends with `_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`, where the two dates are the first and last calendar day of the selected month.

#### Scenario: Exactly one export matches

- **WHEN** exactly one file in the directory matches the selected month's date range
- **THEN** the tool selects that file and continues without asking the user to choose

#### Scenario: No export matches

- **WHEN** no file matches the selected month's date range
- **THEN** the tool reports the searched directory and the expected filename date range, and produces no preview

#### Scenario: Several exports match

- **WHEN** more than one file matches the selected month's date range
- **THEN** the tool lists the candidates and requires an explicit selection before continuing

### Requirement: Person identity from the export

The tool SHALL derive the person's name from the filename segment before the date range, SHALL treat the last whitespace-separated token as the first name, and SHALL address the user by it. When the CSV `Full name` value differs from the filename name, the tool SHALL warn.

#### Scenario: Greeting uses the first name

- **WHEN** the filename contains `Muster-Lang Anna` before the date range
- **THEN** the tool addresses the user as `Anna`

#### Scenario: Filename and CSV name disagree

- **WHEN** the filename name and the CSV `Full name` value differ
- **THEN** the preview includes a warning naming both values

### Requirement: Jira CSV parsing

The tool SHALL parse the export as comma-separated data and SHALL support CRLF line endings, an optional byte-order mark, quoted fields, embedded commas, and doubled quotes. It SHALL ignore rows in which `Issue Key`, `Work date`, and `Hours` are all empty.

#### Scenario: Quoted values are preserved

- **WHEN** a field contains a comma or a doubled quote inside quotes
- **THEN** the parsed value keeps the comma or a single quote character

#### Scenario: Trailing blank rows are ignored

- **WHEN** the export contains comma-only rows after the last entry
- **THEN** those rows produce no day entries and no warnings

#### Scenario: Required columns are missing

- **WHEN** the header lacks `Issue Key`, `Hours`, or `Work date`
- **THEN** the tool reports the missing column and produces no preview

### Requirement: Work date and hours interpretation

The tool SHALL read `Work date` as a month-first `M/D/YY` date with an optional time, SHALL resolve month/day order against the selected month and the `Period` column, and SHALL read `Hours` as a positive decimal number. A row with an unparseable date or non-positive hours SHALL be reported and excluded.

#### Scenario: Month-first date is parsed

- **WHEN** `Work date` is `11/2/26 0:00` for a November 2026 export
- **THEN** the entry is assigned to 2026-11-02

#### Scenario: Ambiguous date is resolved by context

- **WHEN** a date could be read as either month-first or day-first
- **THEN** the reading that falls inside the selected month and matches `Period` is used

#### Scenario: Invalid row is excluded

- **WHEN** a row has an unparseable `Work date` or a zero or negative `Hours`
- **THEN** the tool warns about that row and leaves it out of the aggregation

### Requirement: Daily aggregation

The tool SHALL group entries by calendar work date, SHALL sum their `Hours`, SHALL group the day's entries by `Issue Key`, and SHALL build the description as `KEY: description, description; KEY2: description`. When `Work Description` is empty, the tool SHALL use `Issue summary` for that entry.

#### Scenario: Several entries on one day are summed

- **WHEN** a day has four entries totalling seven hours
- **THEN** the day appears once with seven hours and four entries

#### Scenario: Repeated issue key is merged

- **WHEN** the same `Issue Key` appears twice on one day with different descriptions
- **THEN** the key appears once and its descriptions are joined with a comma

#### Scenario: Empty description falls back to summary

- **WHEN** an entry has an empty `Work Description`
- **THEN** the aggregated description uses the row's `Issue summary`

### Requirement: Preview summary

Before any SAP interaction, the tool SHALL display a per-day table containing the date and weekday, summed hours, entry count, and aggregated description, together with the selected month, the person, total hours, and the number of days with entries.

#### Scenario: Summary reflects the export

- **WHEN** a November 2026 export contains eight entries over two days totalling sixteen hours
- **THEN** the preview shows two day rows, sixteen total hours, and eight total entries

#### Scenario: Export has no data rows

- **WHEN** the export parses to zero data rows
- **THEN** the tool reports that no hours were found and shows no day table

### Requirement: Preview warnings

The preview SHALL warn about weekend entries, days above eight hours, days above twenty-four hours, work dates outside the selected month, identity mismatch, period mismatch, and description truncation.

#### Scenario: Weekend entry

- **WHEN** an entry falls on a Saturday or Sunday
- **THEN** the preview flags that day as a weekend entry

#### Scenario: Long day

- **WHEN** a day totals more than eight hours
- **THEN** the preview flags that day as longer than a normal working day

#### Scenario: Day above twenty-four hours

- **WHEN** a day totals more than twenty-four hours
- **THEN** the preview flags the day as invalid for a single SAP entry

#### Scenario: Description is truncated

- **WHEN** an aggregated description exceeds the SAP note length limit
- **THEN** the preview truncates it and states which issue keys were affected

#### Scenario: Date outside the selected month

- **WHEN** a parsed work date falls outside the selected month
- **THEN** the preview warns and excludes it from the month total

### Requirement: Read-only preview

The tool SHALL NOT send any request to SAP and SHALL NOT modify the export file while producing the preview.

#### Scenario: No SAP traffic

- **WHEN** the preview completes
- **THEN** no SAP request has been made and no time entry has been created, updated, or deleted

#### Scenario: Export is untouched

- **WHEN** the preview completes
- **THEN** the export file content is unchanged

### Requirement: Export directory configuration

The tool SHALL read the export directory from `JIRA_EXPORT_DIR`, SHALL default to the user's Downloads folder, and SHALL expand a leading `~`.

#### Scenario: Default directory

- **WHEN** `JIRA_EXPORT_DIR` is unset
- **THEN** the tool searches the user's Downloads folder

#### Scenario: Configured directory

- **WHEN** `JIRA_EXPORT_DIR` is set to another directory
- **THEN** the tool searches only that directory
