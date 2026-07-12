import { Router } from "express";
import { accessTokenFor, googleGet } from "../google.js";
import { readSession } from "../session.js";

/* Read-only Calendar surface (Stage 2a) — upcoming events from the primary
   calendar, normalized for the SPA Activities/Agenda view. Event writes stay
   OUT until Stage 2b (behind approval + audit). */

export const calendarRouter = Router();

interface GApiEvent {
  id: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string }>;
}
interface GApiEventList { items?: GApiEvent[] }

/* GET /api/calendar/events?limit=20 — upcoming events, soonest first. */
calendarRouter.get("/events", async (req, res) => {
  const sid = readSession(req);
  if (!sid) return res.status(401).json({ error: "unauthenticated" });
  try {
    const accessToken = await accessTokenFor(sid);
    if (!accessToken) return res.status(401).json({ error: "unauthenticated" });

    const limit = Math.min(Number(req.query.limit ?? 20) || 20, 50);
    const timeMin = new Date().toISOString();
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
      `?maxResults=${limit}&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}`;
    const data = await googleGet<GApiEventList>(accessToken, url);

    const events = (data.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? "(no title)",
      location: e.location ?? "",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      attendees: (e.attendees ?? []).map((a) => a.displayName ?? a.email ?? "").filter(Boolean),
    }));

    res.json({ events });
  } catch (err) {
    console.error("[calendar] events failed:", err);
    res.status(502).json({ error: "calendar_upstream" });
  }
});
