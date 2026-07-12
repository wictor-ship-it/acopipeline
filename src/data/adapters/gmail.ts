import { bffFetch } from "./bffClient";

/* Read-only Gmail via the BFF (Stage 2a). Returns null when unreachable or not
   authenticated → the Inbox falls back to seed threads. */

export interface GmailThread {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  count: number;
}

export async function fetchGmailThreads(limit = 20): Promise<GmailThread[] | null> {
  try {
    const data = await bffFetch<{ threads: GmailThread[] }>(`/api/gmail/threads?limit=${limit}`);
    return data.threads;
  } catch {
    return null;
  }
}

export interface GmailMessage { id: string; from: string; to: string; date: string; subject: string; body: string; dir: "in" | "out" }
export interface GmailThreadDetail { id: string; messages: GmailMessage[] }

/** One thread's decoded messages (read-only). null ⇒ unreachable/unauthed. */
export async function fetchGmailThread(id: string): Promise<GmailThreadDetail | null> {
  try {
    return await bffFetch<GmailThreadDetail>(`/api/gmail/threads/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

/* Stage 2b WRITE. Call ONLY from an explicit human-approved action, and write an
   audit row on success (Law 1 · Law 2). Throws BffError (403 ⇒ scope missing). */
export interface SendResult { id: string; threadId: string }
export async function sendGmail(msg: { to: string; subject: string; body: string; threadId?: string }): Promise<SendResult> {
  return bffFetch<SendResult>("/api/gmail/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
}
