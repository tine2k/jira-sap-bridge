import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ExportDiscoveryError, findExports, listExportMonths } from "../src/import/discover.ts";

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

test("lists only the full calendar months that have an export, newest first", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Jane Doe_2026-09-01_2026-09-30.csv"), "");
  await writeFile(join(dir, "User_ Jane Doe_2026-11-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Jane Doe_2026-10-01_2026-10-31.csv"), "");

  const months = await listExportMonths(dir);
  assert.deepEqual(
    months.map((month) => [month.year, month.month]),
    [
      [2026, 11],
      [2026, 10],
      [2026, 9],
    ],
  );
});

test("ignores exports whose dates do not span one full calendar month", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Jane_2026-11-02_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Jane_2026-11-01_2026-11-29.csv"), "");
  await writeFile(join(dir, "User_ Jane_2026-10-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Jane_2026-02-01_2026-02-28.csv"), "");
  assert.deepEqual(
    (await listExportMonths(dir)).map((month) => month.from),
    ["2026-02-01"],
  );
});

test("ignores files that do not follow the export pattern and directories", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "notes.csv"), "");
  await writeFile(join(dir, "timesheet_2026-11-01_2026-11-30.txt"), "");
  await mkdir(join(dir, "User_ Nested_2026-11-01_2026-11-30.csv"));
  assert.deepEqual(await listExportMonths(dir), []);
});

test("lists one month once even when several exports cover it", async (t) => {
  const dir = await tempDir(t);
  await writeFile(join(dir, "User_ Adam_2026-11-01_2026-11-30.csv"), "");
  await writeFile(join(dir, "User_ Zoe_2026-11-01_2026-11-30.csv"), "");
  assert.deepEqual(
    (await listExportMonths(dir)).map((month) => month.from),
    ["2026-11-01"],
  );
});

test("reports a missing directory when listing months", async () => {
  const dir = join(tmpdir(), `missing-${Date.now()}`);
  await assert.rejects(listExportMonths(dir), ExportDiscoveryError);
});
