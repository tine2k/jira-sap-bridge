import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEntryPayload, DATA_FIELD_PROPERTIES, ENTRY_PROPERTIES } from "../src/sap/entry.ts";
import { addConfig } from "./helpers.ts";

test("builds the entry payload for a known configuration", () => {
  const payload = buildEntryPayload(addConfig());
  assert.deepEqual(payload, {
    TimeEntryOperation: "C",
    DataEntryProfile: "S4H_EXT",
    Pernr: "4711",
    WorkDate: "2026-11-24T00:00:00",
    TimeEntryDataFields: {
      BEMOT: "",
      CATSHOURS: "7.5",
      LTXA1: "probe",
      WTART: "REM",
      OVERTIMECAT: "",
    },
    ReleaseTimeEntry: " ",
  });
});

test("reflects alternate configuration values", () => {
  const payload = buildEntryPayload(
    addConfig({ employeeId: "9999", entryDate: "2026-01-02", entryHours: "1.25" }),
  );
  assert.equal(payload[ENTRY_PROPERTIES.employeeId], "9999");
  assert.equal(payload[ENTRY_PROPERTIES.entryDate], "2026-01-02T00:00:00");
  assert.equal(
    (payload[ENTRY_PROPERTIES.dataFields] as Record<string, unknown>)[DATA_FIELD_PROPERTIES.hours],
    "1.25",
  );
});

test("merges accounting assignment fields", () => {
  const payload = buildEntryPayload(
    addConfig({ extraDataFields: { POSID: "AT0110012000001.1.10", SEBELN: "4500000216" } }),
  );
  const fields = payload[ENTRY_PROPERTIES.dataFields] as Record<string, unknown>;
  assert.equal(fields.POSID, "AT0110012000001.1.10");
  assert.equal(fields.SEBELN, "4500000216");
});
