/* SPA → BFF client (Phase 2). Talks to the thin backend that holds the Google
   secret + tokens. Every call is credentialed (httpOnly session cookie). When
   the BFF is unreachable the adapters fall back to null so the Phase 1 demo
   (seed data + mock auth) keeps working with no backend running. */

const BASE = (import.meta.env.VITE_BFF_URL ?? "http://localhost:8787").replace(/\/$/, "");

export const bffBase = (): string => BASE;

export class BffError extends Error {
  constructor(public status: number, public body = "") {
    super(`BFF ${status}`);
    this.name = "BffError";
  }
}

/** Credentialed JSON fetch against the BFF. Throws BffError on non-2xx, or the
    native fetch error when the BFF is unreachable (adapters catch and fall back). */
export async function bffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...init });
  if (!res.ok) throw new BffError(res.status, await res.text().catch(() => ""));
  return (await res.json()) as T;
}
