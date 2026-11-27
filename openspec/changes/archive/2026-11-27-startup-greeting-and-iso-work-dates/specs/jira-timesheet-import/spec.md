# Spec Delta

## MODIFIED Requirements

### Requirement: Person identity from the export

The tool SHALL derive the person's name from the filename segment before the date range, SHALL treat the last whitespace-separated token as the first name, and SHALL address the user by it. The tool SHALL greet the user by that first name on startup, directly after the intro and before the export picker, using the export file proposed as the default; when no export file exists, no greeting SHALL be shown. The preview SHALL also address the user by it. When the CSV `Full name` value differs from the filename name, the tool SHALL warn.

#### Scenario: Greeting uses the first name

- **WHEN** the filename contains `Muster-Lang Anna` before the date range
- **THEN** the tool addresses the user as `Anna`

#### Scenario: Greeting on startup

- **WHEN** the tool starts and at least one export file is offered
- **THEN** the greeting `Hi <first name>` is shown before the export picker, using the first name from the proposed default export

#### Scenario: No greeting without an export

- **WHEN** the tool starts and no export file is offered
- **THEN** no greeting is shown and the download prompt is reported instead

#### Scenario: Filename and CSV name disagree

- **WHEN** the filename name and the CSV `Full name` value differ
- **THEN** the preview includes a warning naming both values

### Requirement: Work date and hours interpretation

The tool SHALL read `Work date` as either a month-first `M/D/YY` date or an ISO `YYYY-MM-DD` date, each with an optional `H:mm` time. For the month-first form it SHALL resolve month/day order against the selected month and the `Period` column. The ISO form is unambiguous and SHALL be used as written. The tool SHALL read `Hours` as a positive decimal number. A row with an unparseable date or non-positive hours SHALL be reported and excluded.

#### Scenario: Month-first date is parsed

- **WHEN** `Work date` is `11/2/26 0:00` for a November 2026 export
- **THEN** the entry is assigned to 2026-11-02

#### Scenario: ISO date is parsed

- **WHEN** `Work date` is `2026-11-26 00:00` for a November 2026 export
- **THEN** the entry is assigned to 2026-11-26 and no warning is produced

#### Scenario: Ambiguous date is resolved by context

- **WHEN** a month-first date could be read as either month-first or day-first
- **THEN** the reading that falls inside the selected month and matches `Period` is used

#### Scenario: Invalid row is excluded

- **WHEN** a row has an unparseable `Work date` or a zero or negative `Hours`
- **THEN** the tool warns about that row and leaves it out of the aggregation
