import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ConfigError,
  loadAddConfig,
  loadConfig,
  loadConnectionConfig,
  loadEmployeeConfig,
} from "../src/config.js";

const complete: Record<string, string> = {
  S4_HOST: "https://tenant.example",
  EMPLOYEE_ID: "4711",
  ENTRY_DATE: "2026-11-24",
  ENTRY_HOURS: "7.5",
};

test("loads a complete configuration", () => {
  const config = loadConfig(complete);
  assert.equal(config.host, "https://tenant.example");
  assert.equal(config.servicePath, "/sap/opu/odata/sap/HCM_CATS_MANAG_V1/");
  assert.equal(config.employeeId, "4711");
  assert.equal(config.entryDate, "2026-11-24");
  assert.equal(config.entryHours, "7.5");
  assert.equal(config.profile, "S4H_EXT");
  assert.equal(config.note, "openspec entry");
  assert.equal(config.timeoutMs, 30000);
});

for (const name of ["S4_HOST", "EMPLOYEE_ID", "ENTRY_DATE", "ENTRY_HOURS"]) {
  test(`names missing ${name}`, () => {
    const env = { ...complete };
    delete env[name];
    assert.throws(
      () => loadConfig(env),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.match(error.message, new RegExp(name));
        return true;
      },
    );
  });
}

test("rejects non-numeric or out-of-range hours", () => {
  for (const hours of ["abc", "0", "-1", "24.5"]) {
    assert.throws(
      () => loadAddConfig({ ...complete, ENTRY_HOURS: hours }),
      /ENTRY_HOURS/,
    );
  }
});

test("rejects invalid calendar dates", () => {
  assert.throws(
    () => loadAddConfig({ ...complete, ENTRY_DATE: "2026-02-30" }),
    /not a valid YYYY-MM-DD calendar date/,
  );
});

test("configures the browser login defaults", () => {
  const config = loadConnectionConfig(complete);
  assert.equal(config.browserProfileDir, ".sap-browser-profile");
  assert.equal(config.browserLoginTimeoutMs, 300000);

  const custom = loadConnectionConfig({
    ...complete,
    SAP_BROWSER_PROFILE: "/tmp/sap-profile",
    SAP_BROWSER_LOGIN_TIMEOUT_MS: "60000",
  });
  assert.equal(custom.browserProfileDir, "/tmp/sap-profile");
  assert.equal(custom.browserLoginTimeoutMs, 60000);
});

test("parses accounting assignment JSON and rejects non-objects", () => {
  const config = loadAddConfig({
    ...complete,
    ENTRY_EXTRA_DATA_FIELDS: '{"POSID":"AT0110012000001.1.10"}',
  });
  assert.deepEqual(config.extraDataFields, { POSID: "AT0110012000001.1.10" });

  assert.throws(
    () => loadAddConfig({ ...complete, ENTRY_EXTRA_DATA_FIELDS: "[1,2]" }),
    /must be a JSON object/,
  );
});

test("reads an employee configuration without entry values", () => {
  assert.deepEqual(loadEmployeeConfig({ EMPLOYEE_ID: "4711" }), { employeeId: "4711" });
  assert.throws(() => loadEmployeeConfig({}), /EMPLOYEE_ID/);
});

test("normalizes a configured service path", () => {
  const config = loadConnectionConfig({
    ...complete,
    S4_SERVICE_PATH: "sap/opu/odata/sap/HCM_CATS_MANAG_V1",
  });
  assert.equal(config.servicePath, "/sap/opu/odata/sap/HCM_CATS_MANAG_V1/");
});
