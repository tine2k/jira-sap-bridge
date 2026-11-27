# Spec Delta

## ADDED Requirements

### Requirement: SAP hours comparison

After the preview, the tool SHALL ask whether to continue to SAP. On confirmation it SHALL authenticate through the existing browser session flow, read the `EMPLOYEE_ID` entries for the first through last day of the selected export month, and print the hours SAP already records for that month, the hours the import would insert, and both entry counts. It SHALL then exit without writing to SAP. Declining SHALL keep the preview-only exit and send no SAP request.

#### Scenario: User declines the comparison

- **WHEN** the preview is shown and the user declines to continue
- **THEN** the tool reports that nothing was sent to SAP and no SAP request is made

#### Scenario: Recorded and planned hours are reported

- **WHEN** SAP holds 4 h across 1 entry for November 2026 and the preview totals 16 h across 8 entries
- **THEN** the tool reports 4 h recorded, 16 h to insert, and both entry counts

#### Scenario: SAP holds no entries for the month

- **WHEN** the employee has no SAP entries in the selected month
- **THEN** the tool reports 0 h recorded and still reports the hours the import would insert

#### Scenario: Login is not completed

- **WHEN** the browser login is not completed within the configured timeout
- **THEN** the tool reports the timeout, exits non-zero, and sends no write request

#### Scenario: Required SAP settings are missing

- **WHEN** `EMPLOYEE_ID` or the `S4_*` connection settings are absent
- **THEN** the tool fails before the SAP request, names the missing settings, and exits non-zero

#### Scenario: SAP rejects the read

- **WHEN** SAP responds to the month read with a non-2xx status
- **THEN** the tool reports the status and SAP error body and exits non-zero

#### Scenario: Nothing is written

- **WHEN** the comparison completes or fails
- **THEN** no time entry has been created, updated, or deleted

## MODIFIED Requirements

### Requirement: Read-only preview

The tool SHALL NOT write to SAP and SHALL NOT modify the export file. It SHALL send no SAP request before the user confirms the comparison, and any SAP request it sends after confirmation SHALL be read-only.

#### Scenario: No SAP traffic

- **WHEN** the preview completes and the user has not confirmed the comparison
- **THEN** no SAP request has been made and no time entry has been created, updated, or deleted

#### Scenario: Export is untouched

- **WHEN** the preview and the comparison complete
- **THEN** the export file content is unchanged
