export interface RawRow {
  issueKey: string;
  issueSummary: string;
  description: string;
  /** Calendar day, YYYY-MM-DD. */
  workDate: string;
  minutes: number;
  fullName: string;
  period: string;
  /** 1-based physical line in the export. */
  line: number;
  /** True when the parsed date falls outside the selected month. */
  outsideSelectedMonth: boolean;
}

export interface RowWarning {
  line: number;
  message: string;
}

export interface ExportReadResult {
  rows: RawRow[];
  warnings: RowWarning[];
}
