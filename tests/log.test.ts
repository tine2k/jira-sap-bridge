import assert from "node:assert/strict";
import { test } from "node:test";
import { redactBody } from "../src/log.js";

test("redacts secrets from error bodies", () => {
  assert.equal(
    redactBody('{"password":"secret","cookie":"abc"}', ["secret", "abc"]),
    '{"password":"***","cookie":"***"}',
  );
});
