import { Router } from "express";
import { accessTokenFor, googleGet, googlePost, GoogleApiError } from "../google.js";
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

/* POST /api/gmail/send — Stage 2b WRITE. Sends one message. LAW 1: this route
   is inert until an explicit human-approved action in the SPA calls it; it
   never fires on its own. Requires the gmail.send scope (added in Google Cloud +
   OAUTH_SCOPES) — a missing scope surfaces as 403 → "reconnect_needed". Callers
   must write an audit row for every send. */
gmailRouter.post("/send", async (req, res) => {
  const sid = readSession(req);
  if (!sid) return res.status(401).json({ error: "unauthenticated" });
  const to = typeof req.body?.to === "string" ? req.body.to : "";
  const subject = typeof req.body?.subject === "string" ? req.body.subject : "";
  const body = typeof req.body?.body === "string" ? req.body.body : "";
  const threadId = typeof req.body?.threadId === "string" ? req.body.threadId : undefined;
  if (!to || !body) return res.status(400).json({ error: "missing_to_or_body" });
  try {
    const accessToken = await accessTokenFor(sid);
    if (!accessToken) return res.status(401).json({ error: "unauthenticated" });

    const rfc822 = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=UTF-8", "", body].join("\r\n");
    const raw = Buffer.from(rfc822, "utf8").toString("base64url");
    const result = await googlePost<{ id: string; threadId: string }>(
      accessToken,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      threadId ? { raw, threadId } : { raw },
    );
    res.json({ id: result.id, threadId: result.threadId });
  } catch (err) {
    if (err instanceof GoogleApiError && err.status === 403) return res.status(403).json({ error: "reconnect_needed", scope: "gmail.send" });
    console.error("[gmail] send failed:", err);
    res.status(502).json({ error: "gmail_upstream" });
  }
});
