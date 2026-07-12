import { bffBase, bffFetch } from "./bffClient";

/* Google auth via the BFF. getGoogleSession() returns null when the BFF is
   unreachable (→ app runs in mock/demo mode). startGoogleLogin() sends the
   browser to the BFF, which redirects to Google's consent screen. */

export interface GoogleSession {
  authed: boolean;
  email: string | null;
  name: string | null;
  configured: boolean;
}

export async function getGoogleSession(): Promise<GoogleSession | null> {
  try {
    return await bffFetch<GoogleSession>("/auth/session");
  } catch {
    return null; // BFF unreachable — caller falls back to demo mode
  }
}

export function startGoogleLogin(): void {
  window.location.href = `${bffBase()}/auth/google/start`;
}

export async function googleLogout(): Promise<void> {
  try {
    await bffFetch("/auth/logout", { method: "POST" });
  } catch {
    /* best-effort */
  }
}
