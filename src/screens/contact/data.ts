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

/* ===== Buyer Requirement Profile (fragment 08 ~408-544) — 6 sections.
   Canonical per-contact seed from logic-and-data.js: prefAsset/prefAreas/
   prefBudget (~2149-2211) + prefsX beds/baths/sqft/notes (~2658-2665). The
   select defaults are the literal option sets from the fragment; per-contact
   picks below are the demo values. Empty string ⇒ show the placeholder. */

export const PROFILE_OPTS = {
  style: ["Contemporary", "Modern", "Classic / Traditional", "Mediterranean", "Industrial / Loft", "No preference"],
  condition: ["Turn-key", "Light renovation OK", "Full renovation OK", "New construction"],
  purpose: ["Primary residence", "Investment", "Vacation home", "Relocation", "1031 exchange"],
  ownership: ["Individual", "Trust", "LLC / Entity", "Family office"],
  timeline: ["Immediate", "Within 3 months", "3–6 months", "6–12 months", "Exploratory"],
  financing: ["All cash", "Conventional mortgage", "Jumbo loan", "Portfolio / private bank", "Undecided"],
  outdoor: ["Balcony / terrace", "Private garden", "Rooftop", "Not required"],
} as const;

export const AMENITIES = [
  "Pool", "Private Gym", "Elevator", "24/7 Security", "Waterfront", "Sea / Water View",
  "Home Office", "Wine Cellar", "Staff Quarters", "Smart Home", "Private Garden",
  "Rooftop Terrace", "Concierge", "EV Charging", "Guest Suite", "Home Theater",
  "Beach Access", "Helipad",
];

export interface BuyerProfile {
  assetType: string; style: string; condition: string; purpose: string; ownership: string; timeline: string;
  areas: string; proximity: string;
  budgetMin: string; budgetMax: string; financing: string;
  bedsMin: string; bathsMin: string; sqftMin: string; lotSize: string; parking: string; outdoor: string;
  amenities: string[];
  nonNegotiables: string; dealbreakers: string; notes: string;
}

/* Canonical demo values, keyed by contact id. */
const PREFS: Record<string, Partial<BuyerProfile>> = {
  marcelo: { assetType: "Penthouse condo", style: "Contemporary", condition: "New construction", purpose: "Primary residence", ownership: "Trust", timeline: "Within 3 months", areas: "Sunny Isles · Bal Harbour", proximity: "Ocean · private schools", budgetMax: "$15–20M", financing: "All cash", bedsMin: "3–4", bathsMin: "4", sqftMin: "4,000–6,000", outdoor: "Balcony / terrace", amenities: ["Pool", "Elevator", "Sea / Water View", "Smart Home"], nonNegotiables: "Private pool · service elevator", notes: "Ocean views · high floor · turnkey" },
  keller: { assetType: "Waterfront compound", style: "Modern", condition: "Turn-key", purpose: "Primary residence", ownership: "Family office", timeline: "3–6 months", areas: "Golden Beach · Indian Creek", proximity: "Gated · deep-water dock", budgetMax: "$25–30M", financing: "Portfolio / private bank", bedsMin: "5+", bathsMin: "6", sqftMin: "8,000+", outdoor: "Private garden", amenities: ["Waterfront", "Staff Quarters", "24/7 Security", "Private Garden"], nonNegotiables: "Discretion · staff quarters · dock", dealbreakers: "No shared amenities", notes: "Waterfront · privacy · dock" },
  sterling: { assetType: "Oceanfront condo", style: "Contemporary", condition: "Turn-key", purpose: "Primary residence", ownership: "Individual", timeline: "Immediate", areas: "Sunny Isles", proximity: "Oceanfront · full-service tower", budgetMax: "$10–12M", financing: "All cash", bedsMin: "3", bathsMin: "3.5", sqftMin: "3,000–4,000", outdoor: "Balcony / terrace", amenities: ["Sea / Water View", "Concierge", "Pool", "24/7 Security"], nonNegotiables: "Full service · ocean view", notes: "Oceanfront · full services" },
  zanotti: { assetType: "Tower condo", areas: "Sunny Isles", budgetMax: "$3–5M", bedsMin: "2–3", bathsMin: "2", sqftMin: "2,000–3,000", amenities: ["Sea / Water View", "Concierge"], notes: "Tower · Sunny Isles" },
  nakamura: { assetType: "Oceanfront condo", purpose: "Investment", timeline: "6–12 months", areas: "Bal Harbour", budgetMax: "$8–10M", bedsMin: "3", bathsMin: "3", sqftMin: "3,000–3,500", amenities: ["Sea / Water View", "Concierge"], notes: "Bal Harbour · long horizon" },
  ravel: { assetType: "Branded residence", style: "Modern", areas: "Faena · Brickell", budgetMax: "$8–10M", bedsMin: "2–3", bathsMin: "3", sqftMin: "2,500–3,500", amenities: ["Concierge", "Home Theater"], notes: "Branded · design-led" },
  alvarez: { assetType: "Tower condo", areas: "Sunny Isles", budgetMax: "$6–8M", bedsMin: "2–3", bathsMin: "2.5", sqftMin: "2,000–2,800", amenities: ["Sea / Water View"], notes: "Tower · Sunny Isles" },
};

const EMPTY: BuyerProfile = {
  assetType: "", style: PROFILE_OPTS.style[0], condition: PROFILE_OPTS.condition[0], purpose: PROFILE_OPTS.purpose[0], ownership: PROFILE_OPTS.ownership[0], timeline: PROFILE_OPTS.timeline[0],
  areas: "", proximity: "", budgetMin: "", budgetMax: "", financing: PROFILE_OPTS.financing[0],
  bedsMin: "", bathsMin: "", sqftMin: "", lotSize: "", parking: "", outdoor: PROFILE_OPTS.outdoor[0],
  amenities: [], nonNegotiables: "", dealbreakers: "", notes: "",
};

export function buildProfile(id: string, saved?: Partial<BuyerProfile>): BuyerProfile {
  return { ...EMPTY, ...(PREFS[id] ?? {}), ...(saved ?? {}) } as BuyerProfile;
}

export function hasProfile(id: string): boolean {
  return !!PREFS[id] && (PREFS[id].assetType ?? "—") !== "—" && (PREFS[id].assetType ?? "") !== "";
}

/* MLS Match demo results (mlsMatches ~4858) — the sweep against the profile.
   Solid tinted plates instead of the prototype's gradients (visual law). */
export const MLS_LANG: Record<string, string> = { marcelo: "PT", duarte: "PT", bittencourt: "PT", keller: "EN", sterling: "EN", nakamura: "EN", zanotti: "EN", ravel: "EN", alvarez: "ES" };
export interface MlsMatch { id: string; addr: string; price: string; specs: string; tagline: string; match: string; isNew: boolean; plate: string }
export const MLS_MATCHES: MlsMatch[] = [
  { id: "m1", addr: "8842 Ocean Drive · Golden Beach", price: "$24.5M", specs: "6 bd · 8 ba · 11,200 sqft · Waterfront", tagline: "Turn-key contemporary · 118 ft of frontage · deep-water dock", match: "96%", isNew: true, plate: "#3B453E" },
  { id: "m2", addr: "12 Indian Creek Island Rd", price: "$41.0M", specs: "7 bd · 9 ba · 15,400 sqft · Waterfront estate", tagline: "Gated island · private beach · full staff quarters", match: "92%", isNew: true, plate: "#463E36" },
  { id: "m3", addr: "305 Ocean Blvd · Golden Beach", price: "$18.9M", specs: "5 bd · 6 ba · 8,600 sqft · Contemporary", tagline: "Turn-key · rooftop pool · smart-home throughout", match: "88%", isNew: false, plate: "#363B45" },
  { id: "m4", addr: "720 Aqua Ave · Miami Beach", price: "$16.2M", specs: "5 bd · 7 ba · 7,900 sqft · New construction", tagline: "Sea view · elevator · wine cellar · private garden", match: "84%", isNew: false, plate: "#3D3645" },
];

/* Relationship timeline — Future ("The plan ahead") + Memory (Past + Agent
   learned). Literal from logic-and-data.js: futBase ~2838, tlLearn ~2870. */
export interface PlanItem { d: string; what: string; why: string; st: string; c: string; goDeal?: boolean }
export const PLAN_AHEAD: Record<string, PlanItem[]> = {
  marcelo: [
    { d: "Jul 09", what: "Value touch — corridor market brief", why: "cadence · draft staged the night before", st: "Scheduled", c: "#0D0D0D" },
    { d: "Jul 18", what: "Re-qualify goals against the mandate", why: "relationship check · agent prepares the brief", st: "Planned", c: "#B45309" },
    { d: "Aug 12", what: "Beatriz birthday — gesture armed", why: "important date · shortlist ready for approval", st: "Armed", c: "#8F8F8F" },
    { d: "Deal →", what: "Search milestones — via Rivage search", why: "2nd visit · contract target · deposits live on the opportunity", st: "Mirror", c: "#5D5D5D", goDeal: true },
  ],
};
export const DEFAULT_PLAN: PlanItem[] = [
  { d: "Jul 10", what: "Value touch — tailored market intel", why: "cadence · agent drafts in the contact language", st: "Scheduled", c: "#0D0D0D" },
  { d: "Jul 18", what: "Re-qualify goals against the mandate", why: "quarterly check · agent prepares the brief", st: "Planned", c: "#B45309" },
  { d: "Aug 01", what: "Key date — gesture armed", why: "important date from the profile", st: "Armed", c: "#8F8F8F" },
];

/* Agent-learned card (Memory band) — shown until saved or dismissed. Only
   contacts with a real logged conversation carry one (marcelo · Jul 04 call). */
export interface Learned { text: string; fields: Partial<{ birthday: string; spouse: string }> }
export const LEARNED: Record<string, Learned> = {
  marcelo: { text: "From the Jul 04 call — birthday Mar 12 · spouse Beatriz (co-decision maker). Save to the profile?", fields: { birthday: "Mar 12", spouse: "Beatriz" } },
};

/* Pre-meeting brief (briefMap ~2480) — agent-generated 30 min before. */
export interface Brief { objections: string[]; family: string[]; comps: string[]; objective: string }
export const BRIEF: Record<string, Brief> = {
  marcelo: {
    objections: ["Spouse concerned re: construction timeline — developer schedule in hand, addressable.", "Comparing vs Estates at Acqualina — leaning Rivage on layout."],
    family: ["Wife weighs heavily on the final call — include her in the 2nd visit.", "Two children · school calendar drives relocation timing (Jan)."],
    comps: ["Rivage PH-A ask $18.5M · $2,980/sf.", "Estates PH $19.9M · move-in ready — his fallback.", "Last Rivage PH sale: $2,870/sf (May)."],
    objective: "Confirm the second visit for Saturday 11:00 with his wife present, and neutralize the timeline concern using the developer schedule. Do not discuss price yet.",
  },
  keller: {
    objections: ["Process requires principal sign-off — speed is not a lever, precision is.", "Counter pending since Thursday."],
    family: ["Institution, not family — treat the analyst as the relationship."],
    comps: ["Golden Beach compound ask $28M.", "Indian Creek comparable traded $31M (Apr)."],
    objective: "Secure the principal call before Wednesday. Lead with the comparative valuation, not urgency.",
  },
};
export const GENERIC_BRIEF: Brief = { objections: ["No open objections logged."], family: ["No family notes on record."], comps: ["No active comps attached."], objective: "Re-establish contact and surface the next natural step." };

/* Enrich · agent scans LinkedIn + public sources (enrichRows ~2766). */
export function enrichRows(name: string): Array<{ field: string; value: string; source: string }> {
  const last = name.split(" ").slice(-1)[0];
  const slug = name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-+|-+$/g, "");
  return [
    { field: "Company", value: `${last} Capital Group`, source: "LinkedIn" },
    { field: "Job Title", value: "Founder & CEO", source: "LinkedIn" },
    { field: "Work Phone", value: "+1 305 892 ····", source: "Company site" },
    { field: "LinkedIn", value: `linkedin.com/in/${slug || "profile"}`, source: "Public profile" },
    { field: "Profile note", value: "Art collector · sailing — add to interests", source: "Press · maritime club roster" },
  ];
}

/* Auto-status by momentum — the agent reads activity signals and, when
   momentum diverges from the set status, proposes a change (or auto-applies it
   when Settings §03 "status" autonomy is on). Curated from the seed narrative;
   the real Claude agent computes this in Phase 2. */
export interface Momentum { reads: "heating" | "cooling"; suggest: string; reason: string }
export const MOMENTUM: Record<string, Momentum> = {
  keller: { reads: "cooling", suggest: "Warm", reason: "The counter has sat since Thursday and everything waits on one principal call — momentum has cooled below a HOT band." },
  nakamura: { reads: "cooling", suggest: "Nurturing", reason: "No inbound in weeks on a long-horizon mandate — momentum has settled into a nurture band." },
  alvarez: { reads: "heating", suggest: "Hot", reason: "Continuum 2904 is under contract and heading to close — engagement is well above a WARM band." },
};

/* Each status carries a cadence + default action plan (Settings §02 spirit). */
export const STATUS_PLAY: Record<string, { cadence: string; action: string }> = {
  Hot: { cadence: "Every 3 days", action: "Agent drafts the next touch; decision items surface daily until it moves." },
  Warm: { cadence: "Every 2 weeks", action: "Value-touch cadence; re-qualify against the mandate monthly." },
  Nurturing: { cadence: "Quarterly", action: "Long-horizon nurture; anniversary + market-brief touches, no pressure." },
  Won: { cadence: "Quarterly + key dates", action: "Post-sale care: referral ask at 90 days, anniversary gesture armed." },
  Lost: { cadence: "Quarterly watch", action: "Loss reason tagged; agent watches for re-entry signals only." },
  "Not classified": { cadence: "Paused", action: "No cadence until a status is set — pick one to arm the plan." },
};

/* Contact information editor — sections & fields. Keys in TOP_KEYS write to the
   contact record (header reads them); the rest live in preferences.info. */
export const INFO_TOP_KEYS = ["name", "email", "phone", "company", "title", "linkedin", "birthday", "spouse", "location", "since", "relationship", "narrative"] as const;
export interface InfoField { key: string; label: string; area?: boolean }
export const INFO_SECTIONS: Array<{ title: string; fields: InfoField[] }> = [
  { title: "Relationship", fields: [
    { key: "relationship", label: "Relationship" }, { key: "role", label: "Role / how you know them" },
    { key: "narrative", label: "Objective & notes", area: true },
  ] },
  { title: "Personal", fields: [
    { key: "name", label: "Full name" }, { key: "nickname", label: "Preferred name" },
    { key: "email", label: "Email" }, { key: "phone", label: "Phone · WhatsApp" },
    { key: "location", label: "Residence" }, { key: "nationality", label: "Nationality" },
    { key: "languages", label: "Languages" }, { key: "birthday", label: "Birthday" },
  ] },
  { title: "Professional", fields: [
    { key: "company", label: "Company" }, { key: "title", label: "Title" },
    { key: "industry", label: "Industry" }, { key: "workPhone", label: "Work phone" },
    { key: "linkedin", label: "LinkedIn" }, { key: "assistant", label: "Assistant / EA" },
  ] },
  { title: "Family", fields: [
    { key: "spouse", label: "Spouse / Partner" }, { key: "children", label: "Children" },
    { key: "familyNotes", label: "Family notes", area: true },
  ] },
  { title: "Important dates", fields: [
    { key: "anniversary", label: "Anniversary" }, { key: "since", label: "Client since" },
    { key: "keyDate", label: "Next key date" },
  ] },
];

/* Status select — canonical 6 (canonS6 ~2933) mapped from the seed's display status. */
export const CANON_STATUS = ["Hot", "Warm", "Nurturing", "Won", "Lost", "Not classified"];
export function toCanonStatus(status: string): string {
  const m: Record<string, string> = { HOT: "Hot", WARM: "Warm", SPHERE: "Nurturing", PAST: "Won", VENDOR: "Nurturing", PARTNER: "Nurturing", SLIPPING: "Nurturing", "YOU OWE": "Nurturing" };
  return m[status] ?? "Not classified";
}
