import { bffFetch } from "./bffClient";

/* Read-only Calendar via the BFF (Stage 2a). Returns null when unreachable or
   not authenticated → Activities falls back to seed agenda. */

export interface CalEvent {
  id: string;
  title: string;
  location: string;
  start: string;
  end: string;
  attendees: string[];
}

export async function fetchCalendarEvents(limit = 20): Promise<CalEvent[] | null> {
  try {
    const data = await bffFetch<{ events: CalEvent[] }>(`/api/calendar/events?limit=${limit}`);
    return data.events;
  } catch {
    return null;
  }
}

/* Stage 2b WRITE. Call ONLY from an explicit human-approved action, and write an
   audit row on success (Law 1 · Law 2). Throws BffError (403 ⇒ scope missing). */
export interface CreatedEvent { id: string; htmlLink: string }
export async function createCalendarEvent(ev: { title: string; start: string; end: string; description?: string; attendees?: string[] }): Promise<CreatedEvent> {
  return bffFetch<CreatedEvent>("/api/calendar/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ev),
  });
}
