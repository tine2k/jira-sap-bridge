import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { expandHome, resolveExportDir } from "../src/import/config.js";

const HOME = "/home/tester";

test("defaults to the user's Downloads folder", () => {
  assert.equal(resolveExportDir({}, HOME), join(HOME, "Downloads"));
  assert.equal(resolveExportDir({ JIRA_EXPORT_DIR: "   " }, HOME), join(HOME, "Downloads"));
});

test("uses an explicit export directory", () => {
  assert.equal(resolveExportDir({ JIRA_EXPORT_DIR: "/data/exports" }, HOME), "/data/exports");
});

test("expands a leading tilde", () => {
  assert.equal(resolveExportDir({ JIRA_EXPORT_DIR: "~/exports" }, HOME), join(HOME, "exports"));
  assert.equal(resolveExportDir({ JIRA_EXPORT_DIR: "~" }, HOME), HOME);
});

test("leaves other paths untouched", () => {
  assert.equal(expandHome("/absolute/path", HOME), "/absolute/path");
  assert.equal(expandHome("relative/path", HOME), "relative/path");
});
