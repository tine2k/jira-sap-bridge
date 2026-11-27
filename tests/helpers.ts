import type { AddEntryConfig, ConnectionConfig } from "../src/config.js";
import type { FetchLike } from "../src/sap/client.js";

export function connection(overrides: Partial<ConnectionConfig> = {}): ConnectionConfig {
  return {
    host: "https://tenant.example",
    servicePath: "/sap/opu/odata/sap/HCM_CATS_MANAG_V1/",
    timeoutMs: 5000,
    browserProfileDir: ".sap-browser-profile",
    browserLoginTimeoutMs: 300000,
    sessionCookie: "SAP_SESSIONID_L54_100=test",
    ...overrides,
  };
}

export function addConfig(overrides: Partial<AddEntryConfig> = {}): AddEntryConfig {
  return {
    employeeId: "4711",
    entryDate: "2026-11-24",
    entryHours: "7.5",
    profile: "S4H_EXT",
    note: "probe",
    extraDataFields: {},
    ...overrides,
  };
}

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export function fakeFetch(
  responses: Array<() => Response | Promise<Response>>,
  calls: RecordedCall[],
): FetchLike {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: Object.fromEntries(headers.entries()),
      body: typeof init?.body === "string"
        ? init.body
        : init?.body instanceof URLSearchParams
          ? init.body.toString()
          : undefined,
    });

    const next = responses.shift();
    if (next === undefined) {
      throw new Error(`Unexpected fetch call: ${init?.method ?? "GET"} ${String(input)}`);
    }
    return next();
  };
}
