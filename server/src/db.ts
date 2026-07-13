/* =========================================================================
   Postgres data layer (Phase 2.3). A per-user JSONB document store that
   mirrors the SPA's IndexedDB object-stores 1:1, plus an insert-only
   audit_log (Law 2). Everything is scoped by `user_id` (the authenticated
   email) so one Principal's data can never touch another's.

   Lives behind DATABASE_URL — when unset, the SPA uses browser IndexedDB and
   none of this runs. Swap target documented in tokenStore.ts.
   ========================================================================= */
import pg from "pg";
import { config } from "./config.js";

/* Stores that live in the `records` table (audit_log has its own table). meta
   holds the per-user seed marker. Mirrors src/data/idb.ts STORES. */
export const RECORD_STORES = new Set([
  "contacts", "mandates", "opportunities", "transactions", "activities",
  "threads", "messages", "drafts", "documents", "referrals",
  "settings", "vault", "meta",
]);

let pool: pg.Pool | null = null;
export function dbPool(): pg.Pool {
  if (!pool) {
    const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      // Managed Postgres (Neon/Render/Supabase) requires TLS; local dev doesn't.
      ssl: local ? undefined : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

let initPromise: Promise<void> | null = null;
/** Idempotent schema creation — safe to call on every boot. */
export function initDb(): Promise<void> {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}
async function doInit(): Promise<void> {
  const p = dbPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS records (
      user_id    text        NOT NULL,
      store      text        NOT NULL,
      id         text        NOT NULL,
      data       jsonb       NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, store, id)
    );
    CREATE INDEX IF NOT EXISTS records_user_store ON records (user_id, store);
    CREATE TABLE IF NOT EXISTS audit_log (
      seq        bigserial   PRIMARY KEY,
      user_id    text        NOT NULL,
      entry      jsonb       NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS audit_user ON audit_log (user_id, seq);
  `);
}

/** Lightweight connectivity probe (SELECT 1). Used by /health so the database
    can be verified end-to-end without signing in. Never throws. */
export async function dbPing(): Promise<boolean> {
  try {
    await dbPool().query("SELECT 1");
    return true;
  } catch (e) {
    console.error("[bff] db ping failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/* --- records (per-user document store) --- */
export async function getAllRecords<T>(userId: string, store: string): Promise<T[]> {
  const r = await dbPool().query("SELECT data FROM records WHERE user_id=$1 AND store=$2", [userId, store]);
  return r.rows.map((row) => row.data as T);
}
export async function getRecord<T>(userId: string, store: string, id: string): Promise<T | undefined> {
  const r = await dbPool().query("SELECT data FROM records WHERE user_id=$1 AND store=$2 AND id=$3", [userId, store, id]);
  return r.rows[0]?.data as T | undefined;
}
export async function putRecord(userId: string, store: string, id: string, data: unknown): Promise<void> {
  await dbPool().query(
    `INSERT INTO records (user_id, store, id, data, updated_at) VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (user_id, store, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, store, id, data],
  );
}
export async function deleteRecord(userId: string, store: string, id: string): Promise<void> {
  await dbPool().query("DELETE FROM records WHERE user_id=$1 AND store=$2 AND id=$3", [userId, store, id]);
}
export async function bulkPutRecords(userId: string, store: string, items: Array<{ id: string; data: unknown }>): Promise<void> {
  if (!items.length) return;
  const client = await dbPool().connect();
  try {
    await client.query("BEGIN");
    for (const it of items) {
      await client.query(
        `INSERT INTO records (user_id, store, id, data, updated_at) VALUES ($1,$2,$3,$4, now())
         ON CONFLICT (user_id, store, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [userId, store, it.id, it.data],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
/** Total record count for a user (used to decide first-run seeding). */
export async function countRecords(userId: string): Promise<number> {
  const r = await dbPool().query("SELECT count(*)::int AS n FROM records WHERE user_id=$1", [userId]);
  return r.rows[0]?.n ?? 0;
}

/* --- audit_log (insert-only — Law 2; no update/delete API exists) --- */
export async function appendAudit(userId: string, entry: unknown): Promise<void> {
  await dbPool().query("INSERT INTO audit_log (user_id, entry) VALUES ($1,$2)", [userId, entry]);
}
export async function getAudit<T>(userId: string): Promise<T[]> {
  const r = await dbPool().query("SELECT entry FROM audit_log WHERE user_id=$1 ORDER BY seq DESC", [userId]);
  return r.rows.map((row) => row.entry as T);
}
