/* =========================================================================
   Repository — the swappable data layer (README §4).
   Every mutation:
     1. writes an insert-only AuditEntry (Law 2)
     2. registers an inverse operation on the UndoStack (Law 3)
   UI code must never touch IndexedDB directly — only this interface.
   ========================================================================= */

import type { Actor, AuditEntry } from "../domain/types";
import { idbBulkPut, idbDelete, idbGet, idbGetAll, idbPut, type StoreName } from "./idb";

export type EntityStore = Exclude<StoreName, "audit_log" | "meta">;

export interface MutationMeta {
  actor: Actor;
  /** agent skill (README §12) when actor === "agent" */
  skill?: string;
  /** human-readable action, e.g. "draft approved", "field edited" */
  action: string;
}

let counter = 0;
export function newId(prefix: string): string {
  counter = (counter + 1) % 46656;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(3, "0")}`;
}

/* --- Undo (Law 3): single-level "last action is always reversible" --- */

export interface UndoableAction {
  label: string;
  undo: () => Promise<void>;
}

type UndoListener = (top: UndoableAction | null) => void;

class UndoStack {
  private stack: UndoableAction[] = [];
  private listeners = new Set<UndoListener>();

  push(action: UndoableAction) {
    this.stack.push(action);
    if (this.stack.length > 10) this.stack.shift();
    this.emit();
  }

  async undoLast(): Promise<string | null> {
    const top = this.stack.pop();
    if (!top) return null;
    await top.undo();
    this.emit();
    return top.label;
  }

  peek(): UndoableAction | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  subscribe(fn: UndoListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const top = this.peek();
    for (const fn of this.listeners) fn(top);
  }
}

export const undoStack = new UndoStack();

/* --- Audit (Law 2): insert-only; no update/delete API exists --- */

async function writeAudit(
  meta: MutationMeta,
  entity: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  const entry: AuditEntry = {
    id: newId("audit"),
    actor: meta.actor,
    skill: meta.skill,
    action: meta.action,
    entity,
    before: before ?? null,
    after: after ?? null,
    created_at: new Date().toISOString(),
  };
  await idbPut("audit_log", entry);
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const all = await idbGetAll<AuditEntry>("audit_log");
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/* --- Change notification: screens re-read after any mutation --- */

type ChangeListener = (store: EntityStore) => void;
const changeListeners = new Set<ChangeListener>();

export function onDataChange(fn: ChangeListener): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

function emitChange(store: EntityStore) {
  for (const fn of changeListeners) fn(store);
}

/* --- CRUD with audit + undo --- */

export async function getAll<T extends { id: string }>(store: EntityStore): Promise<T[]> {
  return idbGetAll<T>(store);
}

export async function getById<T extends { id: string }>(
  store: EntityStore,
  id: string,
): Promise<T | undefined> {
  return idbGet<T>(store, id);
}

/** Create or update; audits before/after and pushes the inverse op. */
export async function save<T extends { id: string }>(
  store: EntityStore,
  value: T,
  meta: MutationMeta,
): Promise<void> {
  const before = await idbGet<T>(store, value.id);
  await idbPut(store, value);
  await writeAudit(meta, `${store}/${value.id}`, before ?? null, value);
  undoStack.push({
    label: meta.action,
    undo: async () => {
      if (before === undefined) {
        await idbDelete(store, value.id);
      } else {
        await idbPut(store, before);
      }
      await writeAudit(
        { actor: "user", action: `undo: ${meta.action}` },
        `${store}/${value.id}`,
        value,
        before ?? null,
      );
      emitChange(store);
    },
  });
  emitChange(store);
}

/** Remove; audits and pushes restore. (Agent Ledger never deletes — archive.) */
export async function remove<T extends { id: string }>(
  store: EntityStore,
  id: string,
  meta: MutationMeta,
): Promise<void> {
  const before = await idbGet<T>(store, id);
  if (before === undefined) return;
  await idbDelete(store, id);
  await writeAudit(meta, `${store}/${id}`, before, null);
  undoStack.push({
    label: meta.action,
    undo: async () => {
      await idbPut(store, before);
      await writeAudit(
        { actor: "user", action: `undo: ${meta.action}` },
        `${store}/${id}`,
        null,
        before,
      );
      emitChange(store);
    },
  });
  emitChange(store);
}

/** Seed-only bulk write — no audit/undo; used once at first boot. */
export async function seedBulk<T extends { id: string }>(
  store: EntityStore,
  values: T[],
): Promise<void> {
  await idbBulkPut(store, values);
}
