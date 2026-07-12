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
