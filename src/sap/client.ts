import type { ConnectionConfig } from "../config.js";
import { buildAuthHeaders, type FetchLike } from "./auth.js";

const ENTITY_SET = "TimeEntryCollection";

export class SapRequestError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message?: string) {
    super(message ?? `SAP request failed with HTTP ${status}`);
    this.name = "SapRequestError";
    this.status = status;
    this.body = body;
  }
}

export class SapTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SapTransportError";
  }
}

export interface AddResult {
  status: number;
  data: unknown;
}

export interface TimeEntry {
  Counter?: string;
  WorkDate?: string | null;
  Status?: string | null;
  TimeEntryDataFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export class SapClient {
  constructor(
    private readonly config: ConnectionConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private get baseUrl(): string {
    return `${this.config.host}${this.config.servicePath}`;
  }

  private url(relative: string): string {
    return new URL(relative, this.baseUrl).toString();
  }

  /** Creates exactly one time entry. */
  async addEntry(payload: Record<string, unknown>): Promise<AddResult> {
    const headers: Record<string, string> = {
      ...(await buildAuthHeaders(this.config, this.fetchImpl)),
      "Content-Type": "application/json",
      Accept: "application/json",
      DataServiceVersion: "2.0",
      MaxDataServiceVersion: "2.0",
      "X-Requested-With": "XMLHttpRequest",
    };
    if (this.config.csrfToken !== undefined) {
      headers["x-csrf-token"] = this.config.csrfToken;
    }

    let response = await this.post(payload, headers);
    const csrfRequirement = response.headers.get("x-csrf-token");

    if (response.status === 403 && csrfRequirement !== null) {
      const retryHeaders = { ...headers };
      const fetched = await this.fetchCsrfToken();
      retryHeaders["x-csrf-token"] = fetched.token;
      if (fetched.cookie !== undefined && fetched.cookie.length > 0) {
        const existing = retryHeaders.Cookie;
        retryHeaders.Cookie = existing !== undefined && existing.length > 0
          ? `${existing}; ${fetched.cookie}`
          : fetched.cookie;
      }
      response = await this.post(payload, retryHeaders);
    }

    const raw = await response.text();
    if (!response.ok) {
      throw this.toRequestError(response, raw);
    }

    try {
      return { status: response.status, data: JSON.parse(raw) as unknown };
    } catch {
      throw new SapRequestError(
        response.status,
        raw,
        `SAP returned HTTP ${response.status} but the response could not be parsed as JSON`,
      );
    }
  }

  /** Reads the employee's entries for one calendar day. */
  async readEntries(employeeId: string, date: string): Promise<TimeEntry[]> {
    const filter = `Pernr eq '${escapeODataString(employeeId)}' and WorkDate eq datetime'${date}T00:00:00'`;
    const relative = `${ENTITY_SET}?$filter=${encodeURIComponent(filter)}`;
    const headers = {
      ...(await buildAuthHeaders(this.config, this.fetchImpl)),
      Accept: "application/json",
      "Cache-Control": "no-cache",
    };

    let response: Response;
    try {
      response = await this.fetchImpl(this.url(relative), {
        method: "GET",
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw new SapTransportError(`SAP GET failed: ${(error as Error).message}`);
    }

    const raw = await response.text();
    if (!response.ok) {
      throw this.toRequestError(response, raw);
    }

    let parsed: { d?: { results?: TimeEntry[] } };
    try {
      parsed = JSON.parse(raw) as { d?: { results?: TimeEntry[] } };
    } catch {
      throw new SapRequestError(
        response.status,
        raw,
        `SAP returned HTTP ${response.status} but the response could not be parsed as JSON`,
      );
    }
    return parsed.d?.results ?? [];
  }

  private async post(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<Response> {
    try {
      return await this.fetchImpl(this.url(ENTITY_SET), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        redirect: "manual",
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw new SapTransportError(`SAP POST failed: ${(error as Error).message}`);
    }
  }

  private async fetchCsrfToken(): Promise<{ token: string; cookie?: string }> {
    const headers = {
      ...(await buildAuthHeaders(this.config, this.fetchImpl)),
      "x-csrf-token": "Fetch",
      Accept: "application/json",
    };

    let response: Response;
    try {
      response = await this.fetchImpl(this.baseUrl, {
        method: "GET",
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw new SapTransportError(`SAP CSRF token request failed: ${(error as Error).message}`);
    }

    const body = await response.text();
    if (!response.ok) {
      throw this.toRequestError(response, body);
    }

    const token = response.headers.get("x-csrf-token");
    if (token === null || token.length === 0) {
      throw new SapRequestError(
        response.status,
        body,
        "SAP required a CSRF token but did not return one",
      );
    }

    const setCookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
    const cookie = setCookies.map((value) => value.split(";")[0]).filter(Boolean).join("; ");

    return cookie.length > 0 ? { token, cookie } : { token };
  }

  private toRequestError(response: Response, body: string): SapRequestError {
    if (response.status >= 300 && response.status < 400) {
      return new SapRequestError(
        response.status,
        body,
        `SAP redirected the request (HTTP ${response.status}); the session is probably not authenticated. ` +
          "Refresh S4_SESSION_COOKIE from the browser or choose another S4_AUTH mode.",
      );
    }
    return new SapRequestError(response.status, body);
  }
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}
