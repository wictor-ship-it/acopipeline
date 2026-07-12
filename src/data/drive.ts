/* Mock Google Drive adapter (Fase 1). A dropped file is "uploaded" to the
   record's Drive folder and the DB stores ONLY the reference — name, type,
   size, who, when, url. File bytes NEVER persist on the client (README §7,
   CLAUDE.md Documentos rule). Phase 2 swaps the mock for the real Drive API. */
import { newId, save, type EntityStore } from "./repository";
import type { Actor, DocumentRef } from "../domain/types";

const FOLDER: Record<DocumentRef["entity"]["kind"], string> = { deal: "Deals", contact: "Contacts", referral: "Referrals" };

function fmtSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Turn a dropped File into a Drive reference (no bytes read/stored) and
    persist it to the documents store with an audit row + Undo. */
export async function dropFile(file: File, entity: DocumentRef["entity"], uploadedBy = "Wictor Arraes", actor: Actor = "agent"): Promise<DocumentRef> {
  const ext = (file.name.split(".").pop() ?? "FILE").toUpperCase().slice(0, 4);
  const ref: DocumentRef = {
    id: newId("doc"),
    entity,
    drive_ref: `drive://A-CO/${FOLDER[entity.kind]}/${entity.id}/${file.name}`,
    name: file.name,
    type: ext,
    size: fmtSize(file.size),
    uploaded_by: uploadedBy,
    at: "Jul 06",
  };
  await save<DocumentRef>("documents" as EntityStore, ref, { actor, skill: "transaction_coordinator", action: `Filed to Drive — ${file.name} · ${FOLDER[entity.kind]}/${entity.id} (reference only)` });
  return ref;
}
