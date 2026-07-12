import { Router } from "express";
import { accessTokenFor, googleGet, googlePost, GoogleApiError } from "../google.js";
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

/* POST /api/calendar/events — Stage 2b WRITE. Creates one event on the primary
   calendar. LAW 1: inert until an explicit human-approved SPA action calls it.
   Requires the calendar.events scope; a missing scope surfaces as 403. Callers
   must write an audit row. Body: { title, start, end, description?, attendees? } */
calendarRouter.post("/events", async (req, res) => {
  const sid = readSession(req);
  if (!sid) return res.status(401).json({ error: "unauthenticated" });
  const title = typeof req.body?.title === "string" ? req.body.title : "";
  const start = typeof req.body?.start === "string" ? req.body.start : "";
  const end = typeof req.body?.end === "string" ? req.body.end : "";
  if (!title || !start || !end) return res.status(400).json({ error: "missing_title_or_times" });
  const attendees = Array.isArray(req.body?.attendees) ? (req.body.attendees as string[]).filter((a) => typeof a === "string") : [];
  try {
    const accessToken = await accessTokenFor(sid);
    if (!accessToken) return res.status(401).json({ error: "unauthenticated" });

    const event = {
      summary: title,
      description: typeof req.body?.description === "string" ? req.body.description : undefined,
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: attendees.map((email) => ({ email })),
    };
    const result = await googlePost<{ id: string; htmlLink: string }>(
      accessToken,
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      event,
    );
    res.json({ id: result.id, htmlLink: result.htmlLink });
  } catch (err) {
    if (err instanceof GoogleApiError && err.status === 403) return res.status(403).json({ error: "reconnect_needed", scope: "calendar.events" });
    console.error("[calendar] create failed:", err);
    res.status(502).json({ error: "calendar_upstream" });
  }
});
