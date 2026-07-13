/* The data backend — one seam the repository writes through, so the storage
   engine can be swapped without touching any screen. Two implementations:

   • idb    — browser IndexedDB (Phase 1 demo / offline / unconfigured).
   • remote — the BFF's Postgres store, per-user (Phase 2.3).

   selectBackend() runs once at boot: if the server reports a database AND this
   browser is signed in, we use remote; otherwise we stay on IndexedDB. */
import { idbGet, idbGetAll, idbPut, idbBulkPut, idbDelete, type StoreName } from "./idb";
import * as server from "./adapters/serverData";

export interface DataBackend {
  get<T>(store: StoreName, id: string): Promise<T | undefined>;
  getAll<T>(store: StoreName): Promise<T[]>;
  put<T extends { id: string }>(store: StoreName, value: T): Promise<void>;
  bulkPut<T extends { id: string }>(store: StoreName, values: T[]): Promise<void>;
  delete(store: StoreName, id: string): Promise<void>;
}

const idbBackend: DataBackend = {
  get: idbGet,
  getAll: idbGetAll,
  put: idbPut,
  bulkPut: idbBulkPut,
  delete: idbDelete,
};

const remoteBackend: DataBackend = {
  get: server.get,
  getAll: server.getAll,
  put: server.put,
  bulkPut: server.bulkPut,
  delete: server.del,
};

let current: DataBackend = idbBackend;

/** The active backend. The repository calls through this. */
export function backend(): DataBackend { return current; }

/** True once the remote (server Postgres) backend is active. */
export function isRemote(): boolean { return current === remoteBackend; }

/** Boot-time selection. Probes the BFF; switches to remote only when a database
    is configured AND the session is authenticated. Any failure ⇒ stays on idb
    (demo/offline), so the app never blocks on the backend. */
export async function selectBackend(): Promise<void> {
  try {
    const s = await server.status();
    if (s.configured && s.authed) current = remoteBackend;
  } catch {
    /* BFF unreachable or no DB — keep IndexedDB. */
  }
}
