import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";
import { getRefreshToken } from "./tokenStore.js";

/* Google OAuth + access-token minting. The BFF holds the client secret and the
   refresh token; it mints short-lived access tokens on demand and calls the
   Gmail/Calendar REST APIs with global fetch (Node 18+). No `googleapis` mega-
   dependency needed for the read-first surface. */

export function oauthClient(): OAuth2Client {
  return new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri });
}

export function authUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: "offline",   // ask for a refresh token
    prompt: "consent",        // force refresh_token on re-consent
    scope: config.scopes,
    state,
    include_granted_scopes: true,
  });
}

export interface ExchangeResult { refreshToken: string | null; profile: { email?: string; name?: string } }

export async function exchangeCode(code: string): Promise<ExchangeResult> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  let profile: { email?: string; name?: string } = {};
  if (tokens.id_token) {
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
    const p = ticket.getPayload();
    if (p) profile = { email: p.email, name: p.name };
  }
  return { refreshToken: tokens.refresh_token ?? null, profile };
}

/** Mint a fresh access token for a session's stored refresh token. */
export async function accessTokenFor(sid: string): Promise<string | null> {
  const refreshToken = getRefreshToken(sid);
  if (!refreshToken) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  return token ?? null;
}

/** Thin authorized GET against a Google REST endpoint. */
export async function googleGet<T = unknown>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/* GoogleApiError carries the upstream status so write routes can map a missing
   scope (403) to a clear "reconnect with send permission" message. */
export class GoogleApiError extends Error {
  constructor(public status: number, public body = "") {
    super(`Google API ${status}`);
    this.name = "GoogleApiError";
  }
}

/** Thin authorized POST (JSON) against a Google REST endpoint (Stage 2b writes). */
export async function googlePost<T = unknown>(accessToken: string, url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new GoogleApiError(res.status, await res.text().catch(() => ""));
  return (await res.json()) as T;
}
