import { Router, type Request, type Response, type NextFunction } from "express";
import { dbConfigured } from "../config.js";
import { readSession } from "../session.js";
import { getProfile } from "../tokenStore.js";
import {
  RECORD_STORES, getAllRecords, getRecord, putRecord, deleteRecord,
  bulkPutRecords, countRecords, appendAudit, getAudit,
} from "../db.js";

/* /api/data — the SPA's persisted store, server-side (Phase 2.3). Every route
   below (except /status) requires an authenticated session and is scoped to
   that user's email, so data is isolated per Principal. audit_log is append-
   only (Law 2): it has no PUT/DELETE — only GET /audit and POST /audit. */
export const dataRouter = Router();

async function currentUser(req: Request): Promise<string | null> {
  const sid = readSession(req);
  const profile = sid ? await getProfile(sid) : null;
  return profile?.email ? profile.email.toLowerCase() : null;
}

/* Public probe — the SPA calls this at boot to choose its data backend. */
dataRouter.get("/status", async (req, res) => {
  res.json({ configured: dbConfigured(), authed: !!(await currentUser(req)) });
});

/* Auth gate for everything else. */
dataRouter.use((req: Request, res: Response, next: NextFunction) => {
  if (!dbConfigured()) return res.status(503).json({ error: "db_not_configured" });
  void currentUser(req).then((user) => {
    if (!user) return res.status(401).json({ error: "unauthenticated" });
    res.locals.userId = user;
    next();
  }).catch(next);
});

const uid = (res: Response): string => res.locals.userId as string;
const validStore = (s: string): boolean => RECORD_STORES.has(s);

/* First-run signal: how many records this user has (SPA seeds when 0). */
dataRouter.get("/count", async (_req, res) => {
  res.json({ count: await countRecords(uid(res)) });
});

/* --- audit_log (insert-only) --- */
dataRouter.get("/audit", async (_req, res) => {
  res.json(await getAudit(uid(res)));
});
dataRouter.post("/audit", async (req, res) => {
  await appendAudit(uid(res), req.body);
  res.json({ ok: true });
});

/* --- records (per store) --- */
dataRouter.get("/records/:store", async (req, res) => {
  const { store } = req.params;
  if (!validStore(store)) return res.status(400).json({ error: "bad_store" });
  res.json(await getAllRecords(uid(res), store));
});
dataRouter.post("/records/:store/bulk", async (req, res) => {
  const { store } = req.params;
  if (!validStore(store)) return res.status(400).json({ error: "bad_store" });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  await bulkPutRecords(uid(res), store, items.map((v: { id: string }) => ({ id: v.id, data: v })));
  res.json({ ok: true, count: items.length });
});
dataRouter.get("/records/:store/:id", async (req, res) => {
  const { store, id } = req.params;
  if (!validStore(store)) return res.status(400).json({ error: "bad_store" });
  const row = await getRecord(uid(res), store, id);
  if (row === undefined) return res.status(404).json({ error: "not_found" });
  res.json(row);
});
dataRouter.put("/records/:store/:id", async (req, res) => {
  const { store, id } = req.params;
  if (!validStore(store)) return res.status(400).json({ error: "bad_store" });
  await putRecord(uid(res), store, id, req.body);
  res.json({ ok: true });
});
dataRouter.delete("/records/:store/:id", async (req, res) => {
  const { store, id } = req.params;
  if (!validStore(store)) return res.status(400).json({ error: "bad_store" });
  await deleteRecord(uid(res), store, id);
  res.json({ ok: true });
});
