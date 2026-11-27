# Spec Delta

## MODIFIED Requirements

### Requirement: Preview summary

Before any SAP interaction, the tool SHALL display a per-day table containing the date and weekday, summed hours, entry count, and aggregated description, together with the selected month, the person, total hours, and the number of days with entries. The table SHALL start with a blank spanning row containing a left-aligned, colored `Week <ISO week number>` title for the first day and repeat it at each week change. Week titles SHALL draw no horizontal rule and never appear after the last day.

#### Scenario: Summary reflects the export

- **WHEN** a November 2026 export contains eight entries over two days totalling sixteen hours
- **THEN** the preview shows two day rows, sixteen total hours, and eight total entries

#### Scenario: Export has no data rows

- **WHEN** the export parses to zero data rows
- **THEN** the tool reports that no hours were found and shows no day table

#### Scenario: A new calendar week starts

- **WHEN** consecutive displayed day rows are Friday 2026-11-06 and Monday 2026-11-09
- **THEN** `Week 45` appears before the Friday row and `Week 46` appears immediately before the Monday row, each as a left-aligned title in a blank separator row without a horizontal rule

#### Scenario: The first displayed day of a week is not Monday

- **WHEN** consecutive displayed day rows are Friday 2026-11-06 and Tuesday 2026-11-10
- **THEN** `Week 45` appears before the Friday row and `Week 46` appears immediately before the Tuesday row without adding rows for missing dates

#### Scenario: Days belong to the same calendar week

- **WHEN** the preview contains only day rows within one Monday-based ISO week
- **THEN** one week title appears before the first day and no other week title appears between those days or between the final day and the total row

#### Scenario: Marker color follows output color settings

- **WHEN** color output is enabled and a week separator is rendered
- **THEN** its left-aligned `Week <number>` title is colored independently of the day-row status colors and no horizontal rule is drawn

#### Scenario: ISO week numbering crosses a year boundary

- **WHEN** consecutive displayed day rows are Friday 2027-01-01 and Monday 2027-01-04
- **THEN** the title before the Friday row is `Week 53` and the title before the Monday row is `Week 1`
