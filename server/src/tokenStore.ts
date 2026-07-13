import fs from "node:fs";
import path from "node:path";
import { encrypt, decrypt } from "./crypto.js";
import { dbConfigured } from "./config.js";
import { saveSession, getSession, deleteSession } from "./db.js";

/* Session token store. When a database is configured (production), sessions live
   in Postgres so they SURVIVE restarts / redeploys / free-tier sleep — the user
   stays signed in. Without a DB (local dev) it falls back to an encrypted JSON
   file. Refresh tokens are always AES-256-GCM encrypted; the profile is kept
   plain for the /auth/session response. */

const FILE = process.env.TOKEN_STORE_PATH
  ? path.resolve(process.env.TOKEN_STORE_PATH)
  : path.join(process.cwd(), ".tokens.json");

export interface Profile { email?: string; name?: string }
interface Entry { enc: string; email?: string; name?: string; createdAt: number }
type Store = Record<string, Entry>;

function loadFile(): Store {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")) as Store; } catch { return {}; }
}
function persistFile(store: Store): void {
  fs.writeFileSync(FILE, JSON.stringify(store), { mode: 0o600 });
}

export async function saveTokens(sid: string, refreshToken: string, profile: Profile): Promise<void> {
  const enc = encrypt(refreshToken);
  if (dbConfigured()) { await saveSession(sid, enc, profile.email, profile.name); return; }
  const store = loadFile();
  store[sid] = { enc, email: profile.email, name: profile.name, createdAt: Date.now() };
  persistFile(store);
}

export async function getRefreshToken(sid: string): Promise<string | null> {
  if (dbConfigured()) { const s = await getSession(sid); return s ? decrypt(s.enc) : null; }
  const e = loadFile()[sid];
  return e ? decrypt(e.enc) : null;
}

export async function getProfile(sid: string): Promise<Profile | null> {
  if (dbConfigured()) { const s = await getSession(sid); return s ? { email: s.email, name: s.name } : null; }
  const e = loadFile()[sid];
  return e ? { email: e.email, name: e.name } : null;
}

export async function clearTokens(sid: string): Promise<void> {
  if (dbConfigured()) { await deleteSession(sid); return; }
  const store = loadFile();
  delete store[sid];
  persistFile(store);
}
