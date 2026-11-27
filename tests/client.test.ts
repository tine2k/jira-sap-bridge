import assert from "node:assert/strict";
import { test } from "node:test";
import { SapClient, SapRequestError, SapTransportError } from "../src/sap/client.js";
import { connection, fakeFetch } from "./helpers.js";

const payload = { Pernr: "4711", CATSHOURS: "7.5" };

test("adds a single entry and reports the result", async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const fetchImpl = fakeFetch(
    [
      () =>
        new Response(JSON.stringify({ d: { Counter: "000000924130" } }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
    ],
    calls,
  );

  const client = new SapClient(connection(), fetchImpl);
  const result = await client.addEntry(payload);

  assert.equal(result.status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "POST");
  assert.match(calls[0]?.url ?? "", /\/TimeEntryCollection$/);
  assert.deepEqual(JSON.parse(calls[0]?.body ?? ""), payload);
  assert.equal(calls[0]?.headers["content-type"], "application/json");
});

test("reports a SAP rejection with status and body", async () => {
  const fetchImpl = fakeFetch([() => new Response("Invalid entry", { status: 400 })], []);

  const client = new SapClient(connection(), fetchImpl);
  await assert.rejects(
    () => client.addEntry(payload),
    (error: unknown) => {
      assert.ok(error instanceof SapRequestError);
      assert.equal(error.status, 400);
      assert.equal(error.body, "Invalid entry");
      return true;
    },
  );
});

test("reports a transport failure", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new TypeError("fetch failed");
  };

  const client = new SapClient(connection(), fetchImpl);
  await assert.rejects(
    () => client.addEntry(payload),
    (error: unknown) => {
      assert.ok(error instanceof SapTransportError);
      assert.match(error.message, /fetch failed/);
      return true;
    },
  );
});

test("reports an unparseable success response without claiming creation", async () => {
  const fetchImpl = fakeFetch([() => new Response("<html>proxy</html>", { status: 201 })], []);

  const client = new SapClient(connection(), fetchImpl);
  await assert.rejects(() => client.addEntry(payload), /could not be parsed as JSON/);
});

test("does not fetch a CSRF token when SAP does not require one", async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const fetchImpl = fakeFetch([() => new Response(JSON.stringify({ d: {} }), { status: 201 })], calls);

  const client = new SapClient(connection(), fetchImpl);
  await client.addEntry(payload);

  assert.deepEqual(calls.map((call) => call.method), ["POST"]);
  assert.equal(calls.some((call) => call.headers["x-csrf-token"] === "Fetch"), false);
});

test("fetches a CSRF token and retries once when SAP requires it", async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const fetchImpl = fakeFetch(
    [
      () =>
        new Response("CSRF token required", {
          status: 403,
          headers: { "x-csrf-token": "Required" },
        }),
      () =>
        new Response("", {
          status: 200,
          headers: {
            "x-csrf-token": "fetched-token",
            "set-cookie": "SAP_SESSIONID=abc; Path=/; HttpOnly",
          },
        }),
      () => new Response(JSON.stringify({ d: { Counter: "1" } }), { status: 201 }),
    ],
    calls,
  );

  const client = new SapClient(connection(), fetchImpl);
  await client.addEntry(payload);

  assert.deepEqual(calls.map((call) => call.method), ["POST", "GET", "POST"]);
  assert.equal(calls[1]?.headers["x-csrf-token"], "Fetch");
  assert.equal(calls[2]?.headers["x-csrf-token"], "fetched-token");
  assert.match(calls[2]?.headers.cookie ?? "", /SAP_SESSIONID=abc/);
});

test("never issues update or delete methods", async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const fetchImpl = fakeFetch([() => new Response(JSON.stringify({ d: {} }), { status: 201 })], calls);

  const client = new SapClient(connection(), fetchImpl);
  await client.addEntry(payload);

  assert.deepEqual(
    calls.map((call) => call.method).filter((method) => ["PATCH", "PUT", "DELETE"].includes(method)),
    [],
  );
});

test("reads entries for one day", async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const fetchImpl = fakeFetch(
    [
      () =>
        new Response(
          JSON.stringify({
            d: { results: [{ Counter: "000000924130", WorkDate: "/Date(1793577600000)/" }] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ],
    calls,
  );

  const client = new SapClient(connection(), fetchImpl);
  const entries = await client.readEntries("4711", "2026-11-02");

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.Counter, "000000924130");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.method, "GET");
  assert.match(calls[0]?.url ?? "", /TimeEntryCollection\?\$filter=/);
  assert.match(decodeURIComponent(calls[0]?.url ?? ""), /Pernr eq '4711' and WorkDate eq datetime'2026-11-02T00:00:00'/);
});

test("reports a read rejection", async () => {
  const fetchImpl = fakeFetch([() => new Response("forbidden", { status: 403 })], []);

  const client = new SapClient(connection(), fetchImpl);
  await assert.rejects(
    () => client.readEntries("4711", "2026-11-02"),
    (error: unknown) => {
      assert.ok(error instanceof SapRequestError);
      assert.equal(error.status, 403);
      return true;
    },
  );
});

test("requires a browser session", async () => {
  const client = new SapClient(connection({ sessionCookie: undefined }), fakeFetch([], []));
  await assert.rejects(
    () => client.readEntries("4711", "2026-11-02"),
    /No SAP session/,
  );
});

test("explains an unauthenticated SAML redirect", async () => {
  const fetchImpl = fakeFetch(
    [() => new Response(null, { status: 302, headers: { location: "https://idp.example/saml" } })],
    [],
  );

  const client = new SapClient(connection(), fetchImpl);

  await assert.rejects(
    () => client.addEntry(payload),
    /redirected the request .*log in again/,
  );
});
