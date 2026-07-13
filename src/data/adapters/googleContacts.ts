/* Google Contacts (People API) via the BFF. Read-only pull of the normalized
   contact list; importing into the CRM happens in the repository (audited).
   Returns null when unreachable / not connected, or throws ReconnectNeeded when
   the granted token predates the contacts scope. */
import { bffFetch, BffError } from "./bffClient";

export interface GoogleContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  birthday?: string;
  location?: string;
  linkedin?: string;
}

export class ReconnectNeeded extends Error {
  constructor() {
    super("reconnect_needed");
    this.name = "ReconnectNeeded";
  }
}

/** Fetch every Google contact, normalized. null ⇒ BFF unreachable / not signed
    in. Throws ReconnectNeeded if the contacts scope wasn't granted. */
export async function fetchGoogleContacts(): Promise<GoogleContact[] | null> {
  try {
    const r = await bffFetch<{ contacts: GoogleContact[]; total: number }>("/api/contacts/google");
    return r.contacts;
  } catch (e) {
    if (e instanceof BffError && e.status === 403) throw new ReconnectNeeded();
    if (e instanceof BffError && e.status === 401) return null; // not signed in
    return null; // unreachable
  }
}
