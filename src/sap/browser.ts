import { chromium } from "playwright";
import type { ConnectionConfig } from "../config.ts";

export class BrowserAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserAuthError";
  }
}

export function buildCookieHeader(cookies: Array<{ name: string; value: string }>): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

/**
 * Opens a real browser so the user can complete the tenant's SSO/MFA flow,
 * then returns the resulting session cookie. The profile directory persists
 * the IdP session between runs.
 */
export async function obtainSessionCookie(config: ConnectionConfig): Promise<string> {
  const timeoutMs = config.browserLoginTimeoutMs ?? 300_000;
  const profileDir = config.browserProfileDir ?? ".sap-browser-profile";
  const serviceUrl = `${config.host}${config.servicePath}`;

  let context;
  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: null,
    });
  } catch (error) {
    throw new BrowserAuthError(
      `Could not open the login browser: ${(error as Error).message}. ` +
        "Run \"npx playwright install chromium\" and use a desktop session.",
    );
  }

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(serviceUrl, { waitUntil: "domcontentloaded" }).catch(() => {
      // The SSO redirect can abort navigation; the session check below decides.
    });

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const cookies = await context.cookies(config.host);
      const hasSession = cookies.some((cookie) => cookie.name.startsWith("SAP_SESSIONID"));

      if (hasSession) {
        const response = await context.request.get(`${serviceUrl}$metadata`, {
          headers: { Accept: "application/xml" },
        });
        const body = await response.text();
        if (response.ok() && body.includes("<EntityType")) {
          return buildCookieHeader(cookies);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }

    throw new BrowserAuthError(
      `Login was not completed within ${Math.round(timeoutMs / 1_000)} seconds.`,
    );
  } finally {
    await context.close();
  }
}
