/* =========================================================================
   Repository — the swappable data layer (README §4). UI never touches IDB
   directly. Every mutation writes an insert-only audit_log row (Law 2) and
   pushes an inverse op on the undo stack (Law 3).
   ========================================================================= */
import type { Actor, AuditEntry, Contact } from "../domain/types";
import type { StoreName } from "./idb";
import { backend } from "./backend";

export type EntityStore = Exclude<StoreName, "audit_log" | "meta">;

export interface MutationMeta { actor: Actor; skill?: string; action: string; }

let counter = 0;
export function newId(prefix: string): string {
  counter = (counter + 1) % 46656;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(3, "0")}`;
}

/* --- Undo (Law 3) --- */
export interface UndoableAction { label: string; undo: () => Promise<void>; }
type UndoListener = (top: UndoableAction | null) => void;

class UndoStack {
  private stack: UndoableAction[] = [];
  private listeners = new Set<UndoListener>();
  push(a: UndoableAction) { this.stack.push(a); if (this.stack.length > 10) this.stack.shift(); this.emit(); }
  async undoLast(): Promise<string | null> {
    const top = this.stack.pop();
    if (!top) return null;
    await top.undo();
    this.emit();
    return top.label;
  }
  peek(): UndoableAction | null { return this.stack[this.stack.length - 1] ?? null; }
  subscribe(fn: UndoListener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { const t = this.peek(); for (const fn of this.listeners) fn(t); }
}
export const undoStack = new UndoStack();

/* --- Audit (Law 2 — insert-only; no update/delete API exists) --- */
async function writeAudit(meta: MutationMeta, entity: string, before: unknown, after: unknown): Promise<void> {
  const entry: AuditEntry = {
    id: newId("audit"), actor: meta.actor, skill: meta.skill, action: meta.action,
    entity, before: before ?? null, after: after ?? null, created_at: new Date().toISOString(),
  };
  await backend().put("audit_log", entry);
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const all = await backend().getAll<AuditEntry>("audit_log");
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Audited, undoable action that isn't plain entity CRUD (content-driven queues). */
export async function recordAction(meta: MutationMeta, entity: string, revert: () => void | Promise<void>): Promise<void> {
  await writeAudit(meta, entity, null, { resolved: true });
  undoStack.push({
    label: meta.action,
    undo: async () => {
      await writeAudit({ actor: "user", action: `undo: ${meta.action}` }, entity, { resolved: true }, null);
      await revert();
    },
  });
}

/* --- Change notification --- */
type ChangeListener = (store: EntityStore) => void;
const changeListeners = new Set<ChangeListener>();
export function onDataChange(fn: ChangeListener): () => void { changeListeners.add(fn); return () => changeListeners.delete(fn); }
function emitChange(store: EntityStore) { for (const fn of changeListeners) fn(store); }

/* --- CRUD with audit + undo (writes through the active backend) --- */
export async function getAll<T extends { id: string }>(store: EntityStore): Promise<T[]> { return backend().getAll<T>(store); }
export async function getById<T extends { id: string }>(store: EntityStore, id: string): Promise<T | undefined> { return backend().get<T>(store, id); }

export async function save<T extends { id: string }>(store: EntityStore, value: T, meta: MutationMeta): Promise<void> {
  const before = await backend().get<T>(store, value.id);
  await backend().put(store, value);
  await writeAudit(meta, `${store}/${value.id}`, before ?? null, value);
  undoStack.push({
    label: meta.action,
    undo: async () => {
      if (before === undefined) await backend().delete(store, value.id); else await backend().put(store, before);
      await writeAudit({ actor: "user", action: `undo: ${meta.action}` }, `${store}/${value.id}`, value, before ?? null);
      emitChange(store);
    },
  });
  emitChange(store);
}

export async function remove<T extends { id: string }>(store: EntityStore, id: string, meta: MutationMeta): Promise<void> {
  const before = await backend().get<T>(store, id);
  if (before === undefined) return;
  await backend().delete(store, id);
  await writeAudit(meta, `${store}/${id}`, before, null);
  undoStack.push({
    label: meta.action,
    undo: async () => {
      await backend().put(store, before);
      await writeAudit({ actor: "user", action: `undo: ${meta.action}` }, `${store}/${id}`, null, before);
      emitChange(store);
    },
  });
  emitChange(store);
}

/** Seed-only bulk write — no audit/undo (baseline state, not a user/agent action). */
export async function seedBulk<T extends { id: string }>(store: EntityStore, values: T[]): Promise<void> {
  await backend().bulkPut(store, values);
}

/* Stores whose rows point at a contact via `contact_id` — repointed on merge so
   nothing is orphaned. `contacts.referral_of` is handled separately. */
const CONTACT_REF_STORES: EntityStore[] = ["mandates", "opportunities", "activities", "threads", "vault"];

/** Fold a secondary contact into the primary in place: fill only-empty scalar
    fields; union tags + language. Never overwrites data the primary already has. */
function foldContact(target: Contact, src: Contact): void {
  const t = target as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(src)) {
    if (k === "id" || k === "tags" || k === "language") continue;
    const cur = t[k];
    if ((cur === undefined || cur === null || cur === "") && v !== undefined && v !== null && v !== "") {
      t[k] = v;
    }
  }
  const tags = new Set([...(target.tags ?? []), ...(src.tags ?? [])]);
  if (tags.size) target.tags = [...tags];
  const langs = new Set<string>([...(target.language ?? []), ...(src.language ?? [])]);
  if (langs.size) target.language = [...langs] as Contact["language"];
}

/** Merge duplicate contacts into `primaryId`: repoint every contact_id reference
    (deals, threads, mandates, activities, vault) + referral_of, fold fields into
    the primary, delete the secondaries. One audit row (Law 2); Undo restores the
    whole prior state (Law 3). CRM-side only — never touches Google. */
export async function mergeContacts(primaryId: string, secondaryIds: string[], meta: MutationMeta): Promise<void> {
  const sec = new Set(secondaryIds.filter((id) => id && id !== primaryId));
  if (!sec.size) return;
  const primary = await backend().get<Contact>("contacts", primaryId);
  if (!primary) return;

  const primaryBefore: Contact = { ...primary };
  const repoints: Array<{ store: EntityStore; before: { id: string } }> = [];
  const secBefore: Contact[] = [];

  // Repoint contact_id references across the ref stores.
  for (const store of CONTACT_REF_STORES) {
    const rows = await backend().getAll<{ id: string; contact_id?: string }>(store);
    for (const r of rows) {
      if (r.contact_id && sec.has(r.contact_id)) {
        repoints.push({ store, before: { ...r } });
        await backend().put(store, { ...r, contact_id: primaryId });
      }
    }
  }

  // Repoint referral_of on any other contact, then fold + delete secondaries.
  const allContacts = await backend().getAll<Contact>("contacts");
  for (const c of allContacts) {
    if (c.referral_of && sec.has(c.referral_of) && !sec.has(c.id) && c.id !== primaryId) {
      repoints.push({ store: "contacts", before: { ...c } });
      await backend().put("contacts", { ...c, referral_of: primaryId });
    }
  }
  const merged: Contact = { ...primary };
  for (const id of sec) {
    const s = allContacts.find((c) => c.id === id);
    if (!s) continue;
    secBefore.push({ ...s });
    foldContact(merged, s);
    await backend().delete("contacts", id);
  }
  await backend().put("contacts", merged);

  await writeAudit(meta, `contacts/merge → ${primaryId}`, { primary: primaryBefore, secondaries: secBefore }, merged);
  undoStack.push({
    label: meta.action,
    undo: async () => {
      for (const rp of repoints) await backend().put(rp.store, rp.before);
      await backend().put("contacts", primaryBefore);
      for (const s of secBefore) await backend().put("contacts", s);
      await writeAudit({ actor: "user", action: `undo: ${meta.action}` }, `contacts/merge → ${primaryId}`, merged, { primary: primaryBefore, secondaries: secBefore });
      emitChange("contacts");
      for (const store of CONTACT_REF_STORES) emitChange(store);
    },
  });
  emitChange("contacts");
  for (const store of CONTACT_REF_STORES) emitChange(store);
}

/** Bulk import (e.g. Google Contacts) — one bulk write, one audit row for the
    batch (Law 2), and a batch Undo that removes the imported ids (Law 3). */
export async function bulkImport<T extends { id: string }>(store: EntityStore, values: T[], meta: MutationMeta): Promise<void> {
  if (!values.length) return;
  await backend().bulkPut(store, values);
  await writeAudit(meta, `${store} (bulk ${values.length})`, null, { imported: values.length });
  const ids = values.map((v) => v.id);
  undoStack.push({
    label: meta.action,
    undo: async () => {
      for (const id of ids) await backend().delete(store, id);
      await writeAudit({ actor: "user", action: `undo: ${meta.action}` }, `${store} (bulk ${ids.length})`, { imported: ids.length }, null);
      emitChange(store);
    },
  });
  emitChange(store);
}
