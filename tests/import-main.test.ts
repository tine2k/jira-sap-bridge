import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mock, test } from "node:test";
import { runImport, type Ui } from "../src/import/main.ts";

const TODAY = { year: 2026, month: 11, day: 27 };
const SAMPLE_DIR = fileURLToPath(new URL("../csv-sample", import.meta.url));
const SAMPLE_FILE = "User_ Maier-Moessner Martin_2026-11-01_2026-11-30.csv";
const EXIT_OK = 0;
const EXIT_ERROR = 1;

type SelectOptions = { options: Array<{ value: string; label: string }>; initialValue?: string };

function fakeUi(choose: (options: SelectOptions) => string) {
  const select = mock.fn(async (options: SelectOptions) => choose(options));
  const log = { error: mock.fn(), info: mock.fn(), message: mock.fn(), warn: mock.fn() };
  const outro = mock.fn();
  const ui = {
    intro: mock.fn(),
    outro,
    cancel: mock.fn(),
    select,
    isCancel: () => false,
    spinner: () => ({ start: mock.fn(), stop: mock.fn() }),
    log,
  };
  return { ui: ui as unknown as Ui, select, outro, log };
}

async function emptyDir(t: { after: (fn: () => Promise<void>) => void }): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "jira-import-main-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("with no export file, reports the download prompt, shows no picker, and produces no preview", async (t) => {
  const dir = await emptyDir(t);
  await writeFile(join(dir, "notes.csv"), "");
  const written: string[] = [];
  const { ui, select, outro, log } = fakeUi(() => {
    throw new Error("picker must not open");
  });

  const code = await runImport(TODAY, dir, ui, (text) => written.push(text));

  assert.equal(code, EXIT_ERROR);
  assert.equal(select.mock.callCount(), 0);
  assert.deepEqual(written, []);
  assert.equal(log.error.mock.callCount(), 1);
  assert.ok(String(log.error.mock.calls[0]?.arguments[0]).includes(dir));
  assert.match(String(log.info.mock.calls[0]?.arguments[0]), /Download the monthly export from Tempo\/Jira/);
  assert.deepEqual(outro.mock.calls[0]?.arguments, ["Nothing to preview."]);
});

test("with the sample export, offers only that file as month and filename and previews it", async () => {
  let offered: SelectOptions | undefined;
  const written: string[] = [];
  const { ui, select, outro } = fakeUi((options) => {
    offered = options;
    return options.options[0]?.value ?? "";
  });

  const code = await runImport(TODAY, SAMPLE_DIR, ui, (text) => written.push(text));

  assert.equal(code, EXIT_OK);
  assert.equal(select.mock.callCount(), 1);
  assert.deepEqual(offered?.options, [
    { value: join(SAMPLE_DIR, SAMPLE_FILE), label: `November 2026 (${SAMPLE_FILE})` },
  ]);
  assert.equal(offered?.initialValue, join(SAMPLE_DIR, SAMPLE_FILE));
  assert.equal(written.length, 1);
  assert.match(written[0] ?? "", /November 2026/);
  assert.deepEqual(outro.mock.calls[0]?.arguments, ["Preview only. Nothing was sent to SAP."]);
});
