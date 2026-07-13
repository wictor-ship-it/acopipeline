/* Server-side data store via the BFF (Phase 2.3). Mirrors the idb primitives
   so the repository can swap backends transparently. audit_log maps to the
   append-only /audit endpoints (Law 2). Every call is credentialed (session
   cookie) and scoped server-side to the authenticated user. */
import { bffFetch, BffError } from "./bffClient";
import type { StoreName } from "../idb";

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function getAll<T>(store: StoreName): Promise<T[]> {
  if (store === "audit_log") return bffFetch<T[]>("/api/data/audit");
  return bffFetch<T[]>(`/api/data/records/${store}`);
}

export async function get<T>(store: StoreName, id: string): Promise<T | undefined> {
  if (store === "audit_log") return undefined; // audit is list-only
  try {
    return await bffFetch<T>(`/api/data/records/${store}/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof BffError && e.status === 404) return undefined;
    throw e;
  }
}

export async function put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  if (store === "audit_log") {
    await bffFetch("/api/data/audit", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(value) });
    return;
  }
  await bffFetch(`/api/data/records/${store}/${encodeURIComponent(value.id)}`, {
    method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(value),
  });
}

export async function bulkPut<T extends { id: string }>(store: StoreName, values: T[]): Promise<void> {
  if (!values.length || store === "audit_log") return;
  await bffFetch(`/api/data/records/${store}/bulk`, {
    method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ items: values }),
  });
}

export async function del(store: StoreName, id: string): Promise<void> {
  if (store === "audit_log") return; // insert-only; nothing to delete
  await bffFetch(`/api/data/records/${store}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Total record count for the signed-in user (SPA seeds config when it's a
    fresh database). Returns 0 if the call fails. */
export async function count(): Promise<number> {
  try {
    const r = await bffFetch<{ count: number }>("/api/data/count");
    return r.count;
  } catch {
    return 0;
  }
}

/** Boot probe: is a server database configured, and is this browser signed in?
    Both true ⇒ the SPA uses the remote backend. */
export async function status(): Promise<{ configured: boolean; authed: boolean }> {
  return bffFetch("/api/data/status");
}
