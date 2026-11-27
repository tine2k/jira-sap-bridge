import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCookieHeader } from "../src/sap/browser.ts";

test("builds a cookie header from browser cookies", () => {
  assert.equal(
    buildCookieHeader([
      { name: "SAP_SESSIONID_L54_100", value: "abc" },
      { name: "sap-usercontext", value: "sap-client=100" },
    ]),
    "SAP_SESSIONID_L54_100=abc; sap-usercontext=sap-client=100",
  );
});
