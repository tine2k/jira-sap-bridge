# Spec Delta

## MODIFIED Requirements

### Requirement: Preview warnings

The preview SHALL warn about weekend entries, days above twelve hours, days above twenty-four hours, work dates outside the selected month, identity mismatch, period mismatch, and description truncation.

#### Scenario: Weekend entry

- **WHEN** an entry falls on a Saturday or Sunday
- **THEN** the preview flags that day as a weekend entry

#### Scenario: Long day

- **WHEN** a day totals more than twelve hours
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
