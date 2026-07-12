import "dotenv/config";

/* Central env-backed config. The server boots even when unconfigured so `npm
   run dev` works before provisioning — routes report what's missing (see
   `missingConfig`). Fill server/.env from server/.env.example. */

export const config = {
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:8787/auth/google/callback",
  scopes: (process.env.OAUTH_SCOPES ?? "openid email profile").split(/\s+/).filter(Boolean),
  sessionSecret: process.env.SESSION_SECRET ?? "",
  tokenKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  port: Number(process.env.PORT ?? 8787),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
} as const;

/** Returns the list of required env vars that are still blank. Empty ⇒ ready. */
export function missingConfig(): string[] {
  const required: Array<[string, string]> = [
    ["GOOGLE_CLIENT_ID", config.clientId],
    ["GOOGLE_CLIENT_SECRET", config.clientSecret],
    ["SESSION_SECRET", config.sessionSecret],
    ["TOKEN_ENCRYPTION_KEY", config.tokenKey],
  ];
  return required.filter(([, v]) => !v).map(([k]) => k);
}

export const isConfigured = () => missingConfig().length === 0;
