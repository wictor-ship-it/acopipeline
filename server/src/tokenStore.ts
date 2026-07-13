import fs from "node:fs";
import path from "node:path";
import { encrypt, decrypt } from "./crypto.js";

/* Dev-grade token store: an encrypted JSON file keyed by session id. Refresh
   tokens are stored encrypted (AES-256-GCM); the profile is kept plain for the
   /auth/session response. PRODUCTION: replace the file with a real DB (Postgres,
   KMS-wrapped keys). The interface below is what the swap must preserve. */

/* Path is configurable so a deploy can point it at a persistent disk
   (e.g. TOKEN_STORE_PATH=/data/.tokens.json on a Render disk); defaults to the
   working directory. Still swap for a DB in a real multi-instance prod. */
const FILE = process.env.TOKEN_STORE_PATH
  ? path.resolve(process.env.TOKEN_STORE_PATH)
  : path.join(process.cwd(), ".tokens.json");

export interface Profile { email?: string; name?: string }
interface Entry { enc: string; email?: string; name?: string; createdAt: number }
type Store = Record<string, Entry>;

function load(): Store {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")) as Store; } catch { return {}; }
}
function persist(store: Store): void {
  fs.writeFileSync(FILE, JSON.stringify(store), { mode: 0o600 });
}

export function saveTokens(sid: string, refreshToken: string, profile: Profile): void {
  const store = load();
  store[sid] = { enc: encrypt(refreshToken), email: profile.email, name: profile.name, createdAt: Date.now() };
  persist(store);
}

export function getRefreshToken(sid: string): string | null {
  const e = load()[sid];
  return e ? decrypt(e.enc) : null;
}

export function getProfile(sid: string): Profile | null {
  const e = load()[sid];
  return e ? { email: e.email, name: e.name } : null;
}

export function clearTokens(sid: string): void {
  const store = load();
  delete store[sid];
  persist(store);
}
