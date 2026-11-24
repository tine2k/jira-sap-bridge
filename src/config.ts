import { validateCalendarDate } from "./date";

export type AuthMode = "basic" | "oauth2" | "session";
export type Env = Record<string, string | undefined>;

export const DEFAULT_SERVICE_PATH = "/sap/opu/odata/sap/HCM_CATS_MANAG_V1/";
export const DEFAULT_TOKEN_PATH = "/sap/bc/sec/oauth2/token";
export const DEFAULT_DATA_ENTRY_PROFILE = "S4H_EXT";

export class ConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "ConfigError";
    this.missing = missing;
  }
}

export interface ConnectionConfig {
  host: string;
  servicePath: string;
  authMode: AuthMode;
  timeoutMs: number;
  user?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tokenPath: string;
  sessionCookie?: string;
  csrfToken?: string;
}

export interface AddEntryConfig {
  employeeId: string;
  entryDate: string;
  entryHours: string;
  profile: string;
  note: string;
  extraDataFields: Record<string, unknown>;
}

export type Config = ConnectionConfig & AddEntryConfig;

function read(env: Env, name: string): string | undefined {
  const value = env[name];
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function requireValue(env: Env, name: string, missing: string[]): string {
  const value = read(env, name);
  if (value === undefined) {
    missing.push(name);
    return "";
  }
  return value;
}

function isAuthMode(value: string): value is AuthMode {
  return value === "basic" || value === "oauth2" || value === "session";
}

function parseTimeout(raw: string | undefined): number {
  const value = Number(raw ?? "30000");
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConfigError(`TIMEOUT_MS must be a positive integer, received "${raw ?? ""}"`);
  }
  return value;
}

export function loadConnectionConfig(env: Env = process.env): ConnectionConfig {
  const missing: string[] = [];
  const host = requireValue(env, "S4_HOST", missing).replace(/\/+$/, "");

  const authModeRaw = (read(env, "S4_AUTH") ?? "basic").toLowerCase();
  if (!isAuthMode(authModeRaw)) {
    throw new ConfigError(
      `Unsupported S4_AUTH "${authModeRaw}". Expected "basic", "oauth2", or "session".`,
    );
  }

  const servicePathRaw = read(env, "S4_SERVICE_PATH") ?? DEFAULT_SERVICE_PATH;
  const servicePath = `/${servicePathRaw.replace(/^\/+|\/+$/g, "")}/`;

  const connection: ConnectionConfig = {
    host,
    servicePath,
    authMode: authModeRaw,
    timeoutMs: parseTimeout(read(env, "TIMEOUT_MS")),
    tokenPath: read(env, "S4_TOKEN_PATH") ?? DEFAULT_TOKEN_PATH,
  };

  switch (authModeRaw) {
    case "basic":
      connection.user = requireValue(env, "S4_USER", missing);
      connection.password = requireValue(env, "S4_PASSWORD", missing);
      break;
    case "oauth2":
      connection.clientId = requireValue(env, "S4_CLIENT_ID", missing);
      connection.clientSecret = requireValue(env, "S4_CLIENT_SECRET", missing);
      break;
    case "session": {
      connection.sessionCookie = requireValue(env, "S4_SESSION_COOKIE", missing);
      const csrfToken = read(env, "S4_CSRF_TOKEN");
      if (csrfToken !== undefined) {
        connection.csrfToken = csrfToken;
      }
      break;
    }
  }

  if (missing.length > 0) {
    throw new ConfigError(`Missing required configuration: ${missing.join(", ")}`, missing);
  }

  return connection;
}

export function loadEmployeeConfig(env: Env = process.env): { employeeId: string } {
  const missing: string[] = [];
  const employeeId = requireValue(env, "EMPLOYEE_ID", missing);
  if (missing.length > 0) {
    throw new ConfigError(`Missing required configuration: ${missing.join(", ")}`, missing);
  }
  return { employeeId };
}

function parseJsonObject(env: Env, name: string): Record<string, unknown> {
  const raw = read(env, name);
  if (raw === undefined) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new ConfigError(`${name} must be a JSON object`);
  }
}

export function loadAddConfig(env: Env = process.env): AddEntryConfig {
  const missing: string[] = [];
  const employeeId = requireValue(env, "EMPLOYEE_ID", missing);
  const entryDate = requireValue(env, "ENTRY_DATE", missing);
  const entryHours = requireValue(env, "ENTRY_HOURS", missing);

  if (missing.length > 0) {
    throw new ConfigError(`Missing required configuration: ${missing.join(", ")}`, missing);
  }

  try {
    validateCalendarDate(entryDate);
  } catch (error) {
    throw new ConfigError((error as Error).message);
  }

  if (!/^\d+(\.\d+)?$/.test(entryHours)) {
    throw new ConfigError(`ENTRY_HOURS must be a positive decimal number, received "${entryHours}"`);
  }
  const hours = Number(entryHours);
  if (!(hours > 0) || hours > 24) {
    throw new ConfigError(`ENTRY_HOURS must be greater than 0 and at most 24, received "${entryHours}"`);
  }

  return {
    employeeId,
    entryDate,
    entryHours,
    profile: read(env, "ENTRY_PROFILE") ?? DEFAULT_DATA_ENTRY_PROFILE,
    note: read(env, "ENTRY_NOTE") ?? "openspec entry",
    extraDataFields: parseJsonObject(env, "ENTRY_EXTRA_DATA_FIELDS"),
  };
}

export function loadConfig(env: Env = process.env): Config {
  return { ...loadConnectionConfig(env), ...loadAddConfig(env) };
}
