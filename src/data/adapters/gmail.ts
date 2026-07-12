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
