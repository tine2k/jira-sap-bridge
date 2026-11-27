import { homedir } from "node:os";
import { join } from "node:path";
import type { Env } from "../config.ts";

export const DEFAULT_EXPORT_DIR_NAME = "Downloads";

/** Expands a leading `~` or `~/` against the supplied home directory. */
export function expandHome(value: string, home: string = homedir()): string {
  if (value === "~") {
    return home;
  }
  if (value.startsWith("~/")) {
    return join(home, value.slice(2));
  }
  return value;
}

/**
 * Resolves the directory searched for monthly exports. Unset or blank
 * `JIRA_EXPORT_DIR` means the user's Downloads folder.
 */
export function resolveExportDir(env: Env = process.env, home: string = homedir()): string {
  const configured = env.JIRA_EXPORT_DIR?.trim();
  if (configured === undefined || configured === "") {
    return join(home, DEFAULT_EXPORT_DIR_NAME);
  }
  return expandHome(configured, home);
}
