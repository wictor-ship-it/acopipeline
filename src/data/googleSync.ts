/* One-way Google Contacts → CRM sync (never writes back to Google). Shared by
   the manual "Sync now" button and the 5-minute background auto-sync. Dedupes
   against the current directory (email, then phone, then name); new people land
   as "Not classified". Every import is one audited bulk write (Law 2). */
import { getAll, bulkImport, newId } from "./repository";
import { fetchGoogleContacts, ReconnectNeeded } from "./adapters/googleContacts";
import type { Contact } from "../domain/types";

const normPhone = (p?: string) => { const d = (p ?? "").replace(/\D/g, ""); return d.length >= 7 ? d : ""; };

export type SyncResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; reason: "unreachable" | "reconnect" | "error" };

/* Module-level guard so the background timer and a manual click never run two
   imports at once (which could double-insert from the same snapshot). */
let inFlight = false;

export async function syncGoogleContacts(actor: "user" | "agent" = "user"): Promise<SyncResult> {
  if (inFlight) return { ok: false, reason: "error" };
  inFlight = true;
  try {
    let gcs;
    try {
      gcs = await fetchGoogleContacts();
    } catch (e) {
      if (e instanceof ReconnectNeeded) return { ok: false, reason: "reconnect" };
      return { ok: false, reason: "error" };
    }
    if (gcs === null) return { ok: false, reason: "unreachable" };

    const contacts = await getAll<Contact>("contacts");
    const haveEmail = new Set(contacts.map((c) => (c.email ?? "").toLowerCase()).filter(Boolean));
    const havePhone = new Set(contacts.map((c) => normPhone(c.phone)).filter(Boolean));
    const seen = new Set<string>();
    const toImport: Contact[] = [];
    for (const g of gcs) {
      const email = (g.email ?? "").toLowerCase();
      const phone = normPhone(g.phone);
      const key = email || phone || g.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (email && haveEmail.has(email)) continue;
      if (!email && phone && havePhone.has(phone)) continue;
      toImport.push({
        id: newId("ct"), name: g.name, category: "sphere", status: "SPHERE",
        directory_status: "Not classified", language: ["EN"],
        email: g.email, phone: g.phone, company: g.company, title: g.title,
        birthday: g.birthday, location: g.location, linkedin: g.linkedin, source: "Google Contacts",
      });
    }
    if (!toImport.length) return { ok: true, imported: 0, skipped: gcs.length };
    await bulkImport("contacts", toImport, {
      actor,
      action: `Imported ${toImport.length} contact${toImport.length === 1 ? "" : "s"} from Google Contacts${actor === "agent" ? " · auto-sync" : ""}`,
    });
    return { ok: true, imported: toImport.length, skipped: gcs.length - toImport.length };
  } finally {
    inFlight = false;
  }
}
