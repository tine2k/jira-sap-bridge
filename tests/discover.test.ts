import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ExportDiscoveryError, listExports } from "../src/import/discover.ts";

async function tempDir(t: { after: (fn: () => Promise<void>) => void }): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "jira-import-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("lists each matching export with its path and name", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Jane Doe_2026-11-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "notes.csv"), "");

  const exports = await listExports(dir);
  assert.equal(exports.length, 1);
  assert.equal(exports[0]?.filename, "User_ Jane Doe_2026-11-01_2026-11-30.csv");
  assert.equal(exports[0]?.name, "Jane Doe");
  assert.equal(exports[0]?.from, "2026-11-01");
  assert.equal(exports[0]?.path, join(dir, "User_ Jane Doe_2026-11-01_2026-11-30.csv"));
});

test("lists exports newest month first, then by filename", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Zoe_2026-10-01_2026-10-31.csv"), "");
  await writeFile(join(dir, "User_ Zoe_2026-11-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Adam_2026-11-01_2026-11-30.csv"), "");

  assert.deepEqual(
    (await listExports(dir)).map((file) => file.filename),
    [
      "User_ Adam_2026-11-01_2026-11-30.csv",
      "User_ Zoe_2026-11-01_2026-11-30.csv",
      "User_ Zoe_2026-10-01_2026-10-31.csv",
    ],
  );
});

test("lists every export that covers the same month", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Adam_2026-11-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Zoe_2026-11-01_2026-11-30.csv"), "");

  assert.deepEqual(
    (await listExports(dir)).map((file) => file.name),
    ["Adam", "Zoe"],
  );
});

test("ignores exports whose dates do not span one full calendar month", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Jane_2026-11-02_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Jane_2026-11-01_2026-11-29.csv"), "");
  await writeFile(join(dir, "User_ Jane_2026-10-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Jane_2026-02-01_2026-02-28.csv"), "");
  assert.deepEqual(
    (await listExports(dir)).map((file) => file.filename),
    ["User_ Jane_2026-02-01_2026-02-28.csv"],
  );
});

test("ignores files that do not follow the export pattern and directories", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "notes.csv"), "");
  await writeFile(join(dir, "timesheet_2026-11-01_2026-11-30.txt"), "");
  await mkdir(join(dir, "User_ Nested_2026-11-01_2026-11-30.csv"));
  assert.deepEqual(await listExports(dir), []);
});

test("returns an empty list when the directory has no exports", async (t) => {
  const dir = await tempDir(t);
  assert.deepEqual(await listExports(dir), []);
});

test("reports a missing export directory by name", async () => {
  const dir = join(tmpdir(), `missing-${Date.now()}`);
  await assert.rejects(listExports(dir), (error: unknown) => {
    assert.ok(error instanceof ExportDiscoveryError);
    assert.equal(error.directory, dir);
    assert.match(error.message, /Export directory not found/);
    return true;
  });
});
