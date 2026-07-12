/* Contact Detail reference data — copied literally from
   design-reference/logic-and-data.js (essenceMap ~2746, sinceMap ~2692,
   journey ~2684, pinnedMap ~2703, ctRelatedMap ~2728, ctCritMap ~2734,
   chat chips ~2822). Keyed by the seeded contact ids. */

export const JOURNEY_SEQ = ["Prospect", "Qualified", "Active client", "Closed", "Advocate"];
export const JOURNEY_IDX: Record<string, number> = { marcelo: 2, keller: 1, sterling: 2, bittencourt: 4, zanotti: 3, nakamura: 2, ravel: 2, alvarez: 2 };

export const ESSENCE: Record<string, string> = {
  marcelo: "Cash buyer, $15–20M — Rivage PH-A toured twice, spouse aligned on Saturday. Momentum above stated probability.",
  keller: "Zurich family office, $25–30M compound — counter open, everything waits on one principal call.",
  sterling: "Repeat client, cash — deciding between Acqualina 4802 and the Estates unit this week.",
  bittencourt: "Your best referral source — seven closed relationships, none asked of her in 94 days.",
};

export const SINCE_LINE: Record<string, string> = {
  marcelo: "Since yesterday: opened the tour report 2× · replied on WhatsApp · Saturday visit confirmed by spouse.",
  keller: "Since Friday: counter still open · principal availability confirmed for this week.",
  sterling: "Since yesterday: opened the tour report 3× · dwelled 4 min on unit 4802.",
  bittencourt: "Since last month: no inbound — referral ask now 94 days overdue.",
};

export const PINNED: Record<string, string[]> = {
  marcelo: ["Spouse decides", "Prefers WhatsApp · PT", "No calls before 10h BRT"],
  keller: ["Principal signs off on everything", "Discretion above speed", "Mondays · 08–10h CET"],
  sterling: ["Cash · services matter most", "Repeat client — direct tone"],
  bittencourt: ["Top referrer · 7 closed intros", "Coffee in São Paulo works"],
};

export interface Related { name: string; role: string; note: string }
export const RELATED: Record<string, Related[]> = {
  marcelo: [{ name: "Beatriz Carvalho", role: "Spouse · decision maker", note: "Aligned on Rivage after Saturday tour" }, { name: "Dr. Paulo Mendes", role: "Attorney", note: "Reviews every contract before signature" }, { name: "Ana Bittencourt", role: "Referred by", note: "Introduced Mar 2026 · São Paulo dinner" }],
  keller: [{ name: "The Principal", role: "UHNW client · signs off", note: "Reachable Mondays 08–10h CET only" }, { name: "Stefan Rüegg", role: "Family office advisor", note: "Day-to-day counterpart in Zurich" }],
  sterling: [{ name: "Margaret Sterling", role: "Spouse", note: "Prefers Acqualina over the Estates unit" }, { name: "David Katz", role: "CPA", note: "Handles 1031 timing" }],
  bittencourt: [{ name: "Marcelo Carvalho", role: "Referral · active", note: "$15–20M cash buyer" }, { name: "Camila Duarte", role: "Referral · nurturing", note: "Introduced Feb 2026" }],
};

export const CRITERIA: Record<string, Array<[string, string]>> = {
  marcelo: [["Budget", "$15–20M · cash"], ["Areas", "Surfside · Bal Harbour · Miami Beach"], ["Type", "New construction PH · waterfront"], ["Beds / Baths", "4+ / 5+"], ["SqFt", "6,000 – 9,000"], ["Must-haves", "Private pool · service elevator"]],
  keller: [["Budget", "$25–30M"], ["Areas", "Golden Beach · Indian Creek"], ["Type", "Gated compound · waterfront"], ["Beds / Baths", "6+ / 7+"], ["SqFt", "10,000+"], ["Must-haves", "Discretion · staff quarters · dock"]],
  sterling: [["Budget", "$8–12M · cash"], ["Areas", "Sunny Isles · Acqualina"], ["Type", "Turn-key condo · high floor"], ["Beds / Baths", "4 / 4.5"], ["SqFt", "3,500 – 5,000"], ["Must-haves", "Full service · ocean view"]],
};

export const CHAT_CHIPS = ["Read this relationship", "What should I do next?", "Draft outreach", "MLS matches for them", "Referral / expansion angle"];

/* Status select — canonical 6 (canonS6 ~2933) mapped from the seed's display status. */
export const CANON_STATUS = ["Hot", "Warm", "Nurturing", "Won", "Lost", "Not classified"];
export function toCanonStatus(status: string): string {
  const m: Record<string, string> = { HOT: "Hot", WARM: "Warm", SPHERE: "Nurturing", PAST: "Won", VENDOR: "Nurturing", PARTNER: "Nurturing", SLIPPING: "Nurturing", "YOU OWE": "Nurturing" };
  return m[status] ?? "Not classified";
}
