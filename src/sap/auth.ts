import { Buffer } from "node:buffer";
import type { ConnectionConfig } from "../config.js";

export type FetchLike = typeof fetch;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

export function buildTokenUrl(config: ConnectionConfig): string {
  if (/^https?:\/\//.test(config.tokenPath)) {
    return config.tokenPath;
  }
  const path = config.tokenPath.startsWith("/") ? config.tokenPath : `/${config.tokenPath}`;
  return `${config.host}${path}`;
}

export async function fetchAccessToken(
  config: ConnectionConfig,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    Authorization: basicAuthHeader(config.clientId ?? "", config.clientSecret ?? ""),
  };

  let response: Response;
  try {
    response = await fetchImpl(buildTokenUrl(config), {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    throw new AuthError(`Token request failed: ${(error as Error).message}`);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new AuthError(`Token request failed with HTTP ${response.status}: ${text}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AuthError("Token endpoint returned malformed JSON");
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new AuthError("Token endpoint returned an unexpected payload");
  }

  const record = parsed as Record<string, unknown>;
  const token = record.access_token;
  if (typeof token !== "string" || token.length === 0) {
    throw new AuthError("Token response did not include access_token");
  }

  const tokenType = typeof record.token_type === "string" && record.token_type.length > 0
    ? record.token_type
    : "Bearer";
  return `${tokenType} ${token}`;
}

export async function buildAuthHeaders(
  config: ConnectionConfig,
  fetchImpl: FetchLike = fetch,
): Promise<Record<string, string>> {
  switch (config.authMode) {
    case "basic":
      return { Authorization: basicAuthHeader(config.user ?? "", config.password ?? "") };
    case "oauth2":
      return { Authorization: await fetchAccessToken(config, fetchImpl) };
    case "session": {
      const headers: Record<string, string> = { Cookie: config.sessionCookie ?? "" };
      if (config.csrfToken !== undefined) {
        headers["x-csrf-token"] = config.csrfToken;
      }
      return headers;
    }
    default:
      throw new AuthError(`Unsupported auth mode: ${String(config.authMode)}`);
  }
}
