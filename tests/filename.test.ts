import assert from "node:assert/strict";
import { test } from "node:test";
import { firstNameFromName, parseExportFilename } from "../src/jira/filename.js";

test("parses a redacted sample export filename", () => {
  const parsed = parseExportFilename(
    "User_ Muster-Lang Anna_2026-11-01_2026-11-30.csv",
  );
  assert.deepEqual(parsed, {
    name: "Muster-Lang Anna",
    from: "2026-11-01",
    to: "2026-11-30",
  });
});

test("parses names containing underscores and without the User_ prefix", () => {
  assert.deepEqual(parseExportFilename("Doe_John_2026-11-01_2026-11-30.csv"), {
    name: "Doe_John",
    from: "2026-11-01",
    to: "2026-11-30",
  });
});

test("is case-insensitive about the extension", () => {
  assert.equal(
    parseExportFilename("User_ Jane Doe_2026-01-01_2026-01-31.CSV")?.name,
    "Jane Doe",
  );
});

test("rejects filenames with a missing or invalid date range", () => {
  assert.equal(parseExportFilename("User_ Jane Doe_2026-11.csv"), null);
  assert.equal(parseExportFilename("User_ Jane Doe_2026-02-30_2026-03-01.csv"), null);
  assert.equal(parseExportFilename("User_ Jane Doe_2026-11-30_2026-11-01.csv"), null);
});

test("rejects filenames that are not CSV exports", () => {
  assert.equal(parseExportFilename("User_ Jane Doe_2026-11-01_2026-11-30.xlsx"), null);
  assert.equal(parseExportFilename("notes.csv"), null);
});

test("derives the first name from the last token", () => {
  assert.equal(firstNameFromName("Muster-Lang Anna"), "Anna");
  assert.equal(firstNameFromName("  Jane   Doe  "), "Doe");
  assert.equal(firstNameFromName("Cher"), "Cher");
});
