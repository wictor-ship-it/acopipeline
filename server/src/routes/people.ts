import { Router } from "express";
import { accessTokenFor, googleGet, GoogleApiError } from "../google.js";
import { readSession } from "../session.js";

/* Google Contacts (People API), read-only. Pulls every connection and
   normalizes it to the SPA's Contact shape. Import into the CRM is a user
   action on the SPA side (audited). Requires the contacts.readonly scope — if
   the granted token lacks it, we 403 "reconnect_needed" so the SPA re-consents. */

export const peopleRouter = Router();

interface GName { displayName?: string }
interface GValue { value?: string; type?: string }
interface GOrg { name?: string; title?: string }
interface GDate { year?: number; month?: number; day?: number }
interface GBirthday { date?: GDate; text?: string }
interface GAddress { city?: string; region?: string; formattedValue?: string }
interface GPerson {
  resourceName?: string;
  names?: GName[];
  emailAddresses?: GValue[];
  phoneNumbers?: GValue[];
  organizations?: GOrg[];
  birthdays?: GBirthday[];
  addresses?: GAddress[];
  urls?: GValue[];
}
interface GConnections { connections?: GPerson[]; nextPageToken?: string; totalPeople?: number }

/* Our normalized contact (maps to src/domain/types.ts Contact identity fields). */
interface NContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  birthday?: string;
  location?: string;
  linkedin?: string;
}

const PERSON_FIELDS = "names,emailAddresses,phoneNumbers,organizations,birthdays,addresses,urls";

function fmtBirthday(b?: GBirthday): string | undefined {
  if (!b) return undefined;
  if (b.text) return b.text;
  const d = b.date;
  if (!d) return undefined;
  const mm = d.month ? String(d.month).padStart(2, "0") : "";
  const dd = d.day ? String(d.day).padStart(2, "0") : "";
  if (d.year && mm && dd) return `${d.year}-${mm}-${dd}`;
  if (mm && dd) return `${mm}-${dd}`;
  return undefined;
}

function normalize(p: GPerson): NContact | null {
  const name = p.names?.[0]?.displayName?.trim();
  const email = p.emailAddresses?.[0]?.value?.trim();
  const phone = p.phoneNumbers?.[0]?.value?.trim();
  // Skip entries with no name AND no email/phone — not a usable contact.
  if (!name && !email && !phone) return null;
  const org = p.organizations?.[0];
  const addr = p.addresses?.[0];
  const location = addr ? [addr.city, addr.region].filter(Boolean).join(", ") || addr.formattedValue : undefined;
  const linkedin = p.urls?.find((u) => /linkedin/i.test(u.value ?? "") || /linkedin/i.test(u.type ?? ""))?.value;
  return {
    name: name || email || phone || "Unknown",
    email, phone,
    company: org?.name?.trim() || undefined,
    title: org?.title?.trim() || undefined,
    birthday: fmtBirthday(p.birthdays?.[0]),
    location: location || undefined,
    linkedin: linkedin || undefined,
  };
}

/* GET /api/contacts/google — all Google connections, normalized. Paginates. */
peopleRouter.get("/google", async (req, res) => {
  const sid = readSession(req);
  if (!sid) return res.status(401).json({ error: "unauthenticated" });
  try {
    const accessToken = await accessTokenFor(sid);
    if (!accessToken) return res.status(401).json({ error: "unauthenticated" });

    const out: NContact[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const url = new URL("https://people.googleapis.com/v1/people/me/connections");
      url.searchParams.set("personFields", PERSON_FIELDS);
      url.searchParams.set("pageSize", "1000");
      url.searchParams.set("sortOrder", "LAST_NAME_ASCENDING");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const data = await googleGet<GConnections>(accessToken, url.toString());
      for (const p of data.connections ?? []) {
        const n = normalize(p);
        if (n) out.push(n);
      }
      pageToken = data.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 20); // safety cap ~20k contacts

    res.json({ contacts: out, total: out.length });
  } catch (err) {
    if (err instanceof GoogleApiError && (err.status === 403 || err.status === 401)) {
      // Token was granted before the contacts scope existed.
      return res.status(403).json({ error: "reconnect_needed" });
    }
    console.error("[people] fetch failed:", err);
    res.status(502).json({ error: "people_upstream" });
  }
});
