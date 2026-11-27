## MODIFIED Requirements

### Requirement: Reporting month selection

The tool SHALL begin by searching the export directory for matching exports and SHALL offer the matching export files, one option per file, each shown as the name of its calendar month followed by the filename in brackets. Only files that match the export pattern and span one full calendar month SHALL be offered. The tool SHALL propose a default file: the export for the previous month on calendar days 1–10 and the export for the current month on days 11–31, when that file exists; otherwise the most recent export file. The user SHALL be able to choose a different offered file before continuing.

#### Scenario: Only exported months are offered

- **WHEN** exports exist for two months in the export directory
- **THEN** the picker lists exactly those two exports, each as `<Month YYYY> (<filename>)`, and no other months

#### Scenario: Default at the start of a month

- **WHEN** the tool starts on a calendar day between 1 and 10 and the previous month has a matching export
- **THEN** the export file for the previous month is proposed as the default

#### Scenario: Default later in a month

- **WHEN** the tool starts on a calendar day between 11 and 31 and the current month has a matching export
- **THEN** the export file for the current month is proposed as the default

#### Scenario: Date-based default has no export

- **WHEN** the date-based default month has no matching export but other months do
- **THEN** the most recent export file is proposed as the default

#### Scenario: User chooses another month

- **WHEN** the user selects an offered file other than the proposed default
- **THEN** discovery and parsing use the first through last calendar day of the month that file's name covers

### Requirement: Export file discovery

The tool SHALL search the configured export directory for CSV files named `User_ <Name>_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`, where the two dates are the first and last calendar day of the same month. Files that do not match this pattern SHALL be ignored. The tool SHALL derive the offered export files from the matching files before asking the user to choose.

#### Scenario: Exactly one export matches

- **WHEN** exactly one file in the directory matches the pattern
- **THEN** the tool offers that single file and the picker shows its filename

#### Scenario: Several exports match

- **WHEN** more than one file in the directory matches the pattern
- **THEN** the tool lists every candidate filename and requires an explicit selection before continuing

#### Scenario: No export matches

- **WHEN** no file in the export directory matches the pattern
- **THEN** the tool reports the searched directory, asks the user to download the monthly export from Tempo/Jira, and produces no preview

#### Scenario: Non-matching files are ignored

- **WHEN** the directory contains files whose names do not follow the pattern or whose dates do not span one full calendar month
- **THEN** those files are not offered

### Requirement: Export directory configuration

The tool SHALL read the export directory from `JIRA_EXPORT_DIR`, SHALL default to the user's Downloads folder, and SHALL expand a leading `~`. Discovery SHALL run against this directory before any file is offered.

#### Scenario: Default directory

- **WHEN** `JIRA_EXPORT_DIR` is unset
- **THEN** the tool searches the user's Downloads folder first

#### Scenario: Configured directory

- **WHEN** `JIRA_EXPORT_DIR` is set to another directory
- **THEN** the tool searches only that directory
