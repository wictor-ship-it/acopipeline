import { Router } from "express";
import { accessTokenFor, googleGet } from "../google.js";
import { readSession } from "../session.js";

/* Read-only Gmail surface (Stage 2a). Normalizes Google's message shape into the
   minimal thread summary the SPA Inbox needs. Sending stays OUT until the
   approval queue is wired (Stage 2b) — Law 1: nothing leaves without approval. */

export const gmailRouter = Router();

interface GApiThreadList { threads?: Array<{ id: string }> }
interface GApiHeader { name: string; value: string }
interface GApiMessage { id: string; snippet?: string; internalDate?: string; payload?: { headers?: GApiHeader[] } }
interface GApiThread { id: string; messages?: GApiMessage[] }

const header = (m: GApiMessage | undefined, name: string): string =>
  m?.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

/* GET /api/gmail/threads?limit=20 — recent Inbox threads, summarized. */
gmailRouter.get("/threads", async (req, res) => {
  const sid = readSession(req);
  if (!sid) return res.status(401).json({ error: "unauthenticated" });
  try {
    const accessToken = await accessTokenFor(sid);
    if (!accessToken) return res.status(401).json({ error: "unauthenticated" });

    const limit = Math.min(Number(req.query.limit ?? 20) || 20, 50);
    const list = await googleGet<GApiThreadList>(
      accessToken,
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${limit}&labelIds=INBOX`,
    );
    const ids = (list.threads ?? []).map((t) => t.id);

    const threads = await Promise.all(ids.map(async (id) => {
      const t = await googleGet<GApiThread>(
        accessToken,
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      );
      const msgs = t.messages ?? [];
      const last = msgs[msgs.length - 1];
      return {
        id: t.id,
        from: header(last, "From"),
        subject: header(msgs[0], "Subject"),
        date: header(last, "Date"),
        snippet: last?.snippet ?? "",
        count: msgs.length,
      };
    }));

    res.json({ threads });
  } catch (err) {
    console.error("[gmail] threads failed:", err);
    res.status(502).json({ error: "gmail_upstream" });
  }
});
