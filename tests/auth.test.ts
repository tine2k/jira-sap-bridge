import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import { AuthError, buildAuthHeaders } from "../src/sap/auth.js";
import { connection, fakeFetch } from "./helpers.js";

test("builds a basic authorization header", async () => {
  const headers = await buildAuthHeaders(connection({ user: "user", password: "pass" }));
  assert.equal(headers.Authorization, `Basic ${Buffer.from("user:pass").toString("base64")}`);
});

test("fetches an OAuth 2.0 client-credentials token", async () => {
  const calls: Parameters<typeof fakeFetch>[1] = [];
  const fetchImpl = fakeFetch(
    [
      () =>
        new Response(JSON.stringify({ access_token: "abc", token_type: "bearer" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ],
    calls,
  );

  const headers = await buildAuthHeaders(
    connection({ authMode: "oauth2", clientId: "id", clientSecret: "secret" }),
    fetchImpl,
  );

  assert.equal(headers.Authorization, "bearer abc");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://tenant.example/sap/bc/sec/oauth2/token");
  assert.equal(calls[0]?.body, "grant_type=client_credentials");
  assert.match(calls[0]?.headers.authorization ?? "", /^Basic /);
});

test("reports a failed token request", async () => {
  const fetchImpl = fakeFetch(
    [() => new Response("invalid_client", { status: 401 })],
    [],
  );

  await assert.rejects(
    () => buildAuthHeaders(connection({ authMode: "oauth2", clientId: "id", clientSecret: "bad" }), fetchImpl),
    (error: unknown) => {
      assert.ok(error instanceof AuthError);
      assert.match(error.message, /HTTP 401/);
      return true;
    },
  );
});

test("reports a malformed token response", async () => {
  const fetchImpl = fakeFetch(
    [() => new Response("not json", { status: 200 })],
    [],
  );

  await assert.rejects(
    () => buildAuthHeaders(connection({ authMode: "oauth2", clientId: "id", clientSecret: "secret" }), fetchImpl),
    /malformed JSON/,
  );
});

test("builds session cookie headers and includes a configured csrf token", async () => {
  const headers = await buildAuthHeaders(
    connection({
      authMode: "session",
      sessionCookie: "SAP_SESSIONID=abc",
      csrfToken: "token",
    }),
  );
  assert.equal(headers.Cookie, "SAP_SESSIONID=abc");
  assert.equal(headers["x-csrf-token"], "token");
});

test("rejects an unsupported auth mode at runtime", async () => {
  await assert.rejects(
    () => buildAuthHeaders(connection({ authMode: "kerberos" as never })),
    /Unsupported auth mode/,
  );
});
