import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ExportDiscoveryError, findExports } from "../src/import/discover.js";

const NOVEMBER = { from: "2026-11-01", to: "2026-11-30" };

async function tempDir(t: { after: (fn: () => Promise<void>) => void }): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "jira-import-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("finds the single export matching the month", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Jane Doe_2026-11-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Jane Doe_2026-10-01_2026-10-31.csv"), "");
  await writeFile(join(dir, "notes.csv"), "");
  await mkdir(join(dir, "User_ Nested_2026-11-01_2026-11-30.csv"));

  const matches = await findExports(dir, NOVEMBER);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.filename, "User_ Jane Doe_2026-11-01_2026-11-30.csv");
  assert.equal(matches[0]?.name, "Jane Doe");
  assert.equal(matches[0]?.path, join(dir, "User_ Jane Doe_2026-11-01_2026-11-30.csv"));
});

test("returns every match, sorted by filename", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Zoe_2026-11-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Adam_2026-11-01_2026-11-30.csv"), "");

  const matches = await findExports(dir, NOVEMBER);
  assert.deepEqual(
    matches.map((match) => match.name),
    ["Adam", "Zoe"],
  );
});

test("returns an empty list when nothing matches", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Jane_2026-12-01_2026-12-31.csv"), "");
  assert.deepEqual(await findExports(dir, NOVEMBER), []);
});

test("reports a missing export directory by name", async () => {
  const dir = join(tmpdir(), `missing-${Date.now()}`);
  await assert.rejects(findExports(dir, NOVEMBER), (error: unknown) => {
    assert.ok(error instanceof ExportDiscoveryError);
    assert.equal(error.directory, dir);
    assert.match(error.message, /Export directory not found/);
    return true;
  });
});
