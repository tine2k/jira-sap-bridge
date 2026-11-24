import type { AddEntryConfig } from "../config.js";
import { formatEntryDate } from "../date.js";

/**
 * Payload shape used by the Fiori time sheet (HCM_CATS_MANAG_V1).
 * The date and operation live on the root; accounting fields are nested.
 */
export const ENTRY_PROPERTIES = {
  employeeId: "Pernr",
  operation: "TimeEntryOperation",
  profile: "DataEntryProfile",
  entryDate: "WorkDate",
  release: "ReleaseTimeEntry",
  dataFields: "TimeEntryDataFields",
} as const;

export const DATA_FIELD_PROPERTIES = {
  hours: "CATSHOURS",
  note: "LTXA1",
} as const;

export function buildEntryPayload(config: AddEntryConfig): Record<string, unknown> {
  return {
    [ENTRY_PROPERTIES.operation]: "C",
    [ENTRY_PROPERTIES.profile]: config.profile,
    [ENTRY_PROPERTIES.employeeId]: config.employeeId,
    [ENTRY_PROPERTIES.entryDate]: formatEntryDate(config.entryDate),
    [ENTRY_PROPERTIES.dataFields]: {
      BEMOT: "",
      [DATA_FIELD_PROPERTIES.hours]: config.entryHours,
      [DATA_FIELD_PROPERTIES.note]: config.note,
      WTART: "REM",
      OVERTIMECAT: "",
      ...config.extraDataFields,
    },
    [ENTRY_PROPERTIES.release]: " ",
  };
}
