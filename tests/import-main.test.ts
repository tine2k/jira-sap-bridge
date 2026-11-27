import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mock, test } from "node:test";
import { ConfigError } from "../src/config.ts";
import { runImport, type Ui } from "../src/import/main.ts";
import type { SapComparison } from "../src/import/sap-compare.ts";
import { BrowserAuthError } from "../src/sap/browser.ts";
import { SapRequestError, SapTransportError } from "../src/sap/client.ts";

const TODAY = { year: 2026, month: 11, day: 27 };
const SAMPLE_DIR = fileURLToPath(new URL("../csv-sample", import.meta.url));
const SAMPLE_FILE = "User_ Maier-Moessner Martin_2026-11-01_2026-11-30.csv";
const EXIT_OK = 0;
const EXIT_ERROR = 1;

type SelectOptions = { options: Array<{ value: string; label: string }>; initialValue?: string };

function fakeUi(choose: (options: SelectOptions) => string, confirmed = false, cancelled = false) {
  const select = mock.fn(async (options: SelectOptions) => choose(options));
  const confirm = mock.fn(async () => confirmed);
  const log = { error: mock.fn(), info: mock.fn(), message: mock.fn(), warn: mock.fn() };
  const outro = mock.fn();
  const ui = {
    intro: mock.fn(),
    outro,
    cancel: mock.fn(),
    select,
    confirm,
    isCancel: (value: unknown) => cancelled && typeof value === "boolean",
    spinner: () => ({ start: mock.fn(), stop: mock.fn() }),
    log,
  };
  return { ui: ui as unknown as Ui, select, confirm, outro, log };
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

test("greets the user by first name before the picker opens", async () => {
  let greetingsAtPicker = -1;
  const { ui, log } = fakeUi(() => {
    greetingsAtPicker = log.message.mock.callCount();
    return join(SAMPLE_DIR, SAMPLE_FILE);
  });

  await runImport(TODAY, SAMPLE_DIR, ui, () => {});

  assert.equal(greetingsAtPicker, 1);
  assert.equal(log.message.mock.calls[0]?.arguments[0], "Hi Martin \u{1F44B}");
});

test("greets from the default export, not the first offered file", async (t) => {
  const dir = await emptyDir(t);
  const header = "Issue Key,Hours,Work date\n";
  await writeFile(join(dir, "User_ Zoe Lang_2026-10-01_2026-10-31.csv"), header);
  await writeFile(join(dir, "User_ Adam Muster-Lang_2026-11-01_2026-11-30.csv"), header);
  const { ui, log } = fakeUi((options) => options.options[0]?.value ?? "");

  await runImport(TODAY, dir, ui, () => {});

  assert.equal(log.message.mock.calls[0]?.arguments[0], "Hi Muster-Lang \u{1F44B}");
});

test("shows no greeting when no export exists", async (t) => {
  const dir = await emptyDir(t);
  const { ui, log } = fakeUi(() => {
    throw new Error("picker must not open");
  });

  await runImport(TODAY, dir, ui, () => {});

  assert.equal(log.message.mock.callCount(), 0);
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

const COMPARISON: SapComparison = {
  recordedHours: "4",
  recordedEntries: 1,
  plannedHours: "16",
  plannedEntries: 8,
};

test("declining the comparison keeps the preview-only exit and skips SAP", async () => {
  const written: string[] = [];
  let compared = 0;
  const { ui, confirm, outro } = fakeUi((options) => options.options[0]?.value ?? "", false);

  const code = await runImport(TODAY, SAMPLE_DIR, ui, (text) => written.push(text), {
    compare: async () => {
      compared += 1;
      return COMPARISON;
    },
  });

  assert.equal(code, EXIT_OK);
  assert.equal(confirm.mock.callCount(), 1);
  assert.equal(compared, 0);
  assert.equal(written.length, 1);
  assert.deepEqual(outro.mock.calls.at(-1)?.arguments, ["Preview only. Nothing was sent to SAP."]);
});

test("a cancelled comparison prompt keeps the preview-only exit and skips SAP", async () => {
  const written: string[] = [];
  let compared = 0;
  const { ui, outro } = fakeUi((options) => options.options[0]?.value ?? "", true, true);

  const code = await runImport(TODAY, SAMPLE_DIR, ui, (text) => written.push(text), {
    compare: async () => {
      compared += 1;
      return COMPARISON;
    },
  });

  assert.equal(code, EXIT_OK);
  assert.equal(compared, 0);
  assert.equal(written.length, 1);
  assert.deepEqual(outro.mock.calls.at(-1)?.arguments, ["Preview only. Nothing was sent to SAP."]);
});

test("a confirmed comparison prints recorded and planned hours", async () => {
  const written: string[] = [];
  const { ui, outro } = fakeUi((options) => options.options[0]?.value ?? "", true);

  const code = await runImport(TODAY, SAMPLE_DIR, ui, (text) => written.push(text), {
    compare: async () => COMPARISON,
  });

  assert.equal(code, EXIT_OK);
  assert.equal(written.length, 2);
  assert.match(written[1] ?? "", /SAP recorded: 4 h across 1 entry/);
  assert.match(written[1] ?? "", /Import would insert: 16 h across 8 entries/);
  assert.deepEqual(outro.mock.calls.at(-1)?.arguments, [
    "Comparison only. Nothing was written to SAP.",
  ]);
});

test("a month without SAP entries reports zero recorded hours", async () => {
  const written: string[] = [];
  const { ui } = fakeUi((options) => options.options[0]?.value ?? "", true);

  const code = await runImport(TODAY, SAMPLE_DIR, ui, (text) => written.push(text), {
    compare: async () => ({
      recordedHours: "0",
      recordedEntries: 0,
      plannedHours: "16",
      plannedEntries: 8,
    }),
  });

  assert.equal(code, EXIT_OK);
  assert.match(written[1] ?? "", /SAP recorded: 0 h across 0 entries/);
  assert.match(written[1] ?? "", /Import would insert: 16 h across 8 entries/);
});

const SAP_ERRORS: Array<[Error, RegExp]> = [
  [
    new ConfigError("Missing required configuration: EMPLOYEE_ID", ["EMPLOYEE_ID"]),
    /^Configuration error: Missing required configuration: EMPLOYEE_ID$/,
  ],
  [new BrowserAuthError("Login was not completed within 300 seconds."), /^Login was not completed/],
  [new SapTransportError("SAP GET failed: fetch failed"), /^SAP GET failed/],
  [new SapRequestError(500, "boom"), /^SAP request failed with HTTP 500$/],
  [new SapRequestError(401, "<html>login</html>"), /SAP returned a login page; the session expired/],
];

for (const [error, pattern] of SAP_ERRORS) {
  test(`reports ${error.name} from the SAP comparison`, async () => {
    const { ui, log } = fakeUi((options) => options.options[0]?.value ?? "", true);

    const code = await runImport(TODAY, SAMPLE_DIR, ui, () => {}, {
      compare: async () => {
        throw error;
      },
    });

    assert.equal(code, EXIT_ERROR);
    const messages = log.error.mock.calls.map((call) => String(call.arguments[0]));
    assert.ok(
      messages.some((message) => pattern.test(message)),
      `expected ${JSON.stringify(messages)} to match ${pattern}`,
    );
  });
}
