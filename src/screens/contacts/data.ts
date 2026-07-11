/* Contacts-directory reference data — copied literally from
   design-reference/logic-and-data.js (relData ~1018, segments/columns ~2447,
   touch queue ~2265, Google-sync banner ~2418). The report figures are the
   prototype's aggregate demo numbers (the table below shows the sample rows). */

export const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/* ---- Relationship health per segment (report bar) ---- */
export interface Metric { v: string; d30: string; dQ: string; dY: string; }
export interface RelSegment { label: string; active: Metric; comp: Metric; risk: Metric; fresh: Metric; resp: Metric; }

export const REL_DATA: Record<string, RelSegment> = {
  all:       { label: "All",       active: { v: "486", d30: "+34", dQ: "+92", dY: "+161" }, comp: { v: "87%", d30: "+2.1pp", dQ: "+4.8pp", dY: "+9.5pp" }, risk: { v: "23", d30: "-4", dQ: "-9", dY: "-15" }, fresh: { v: "34", d30: "+8", dQ: "+15", dY: "+22" }, resp: { v: "62%", d30: "+1.8pp", dQ: "+3.4pp", dY: "+6.9pp" } },
  clients:   { label: "Clients",   active: { v: "92",  d30: "+6",  dQ: "+14", dY: "+28" },  comp: { v: "94%", d30: "+1.2pp", dQ: "+2.6pp", dY: "+5.1pp" }, risk: { v: "3",  d30: "-1", dQ: "-3", dY: "-6" },  fresh: { v: "6",  d30: "+2", dQ: "+3",  dY: "+5" },  resp: { v: "78%", d30: "+0.9pp", dQ: "+2.2pp", dY: "+4.6pp" } },
  prospects: { label: "Prospects", active: { v: "164", d30: "+22", dQ: "+58", dY: "+96" },  comp: { v: "82%", d30: "+3.4pp", dQ: "+6.1pp", dY: "+11.2pp" }, risk: { v: "12", d30: "-2", dQ: "-4", dY: "-7" },  fresh: { v: "22", d30: "+5", dQ: "+9",  dY: "+14" }, resp: { v: "54%", d30: "+2.6pp", dQ: "+4.8pp", dY: "+8.3pp" } },
  sphere:    { label: "Sphere",    active: { v: "148", d30: "+4",  dQ: "+11", dY: "+24" },  comp: { v: "85%", d30: "+1.6pp", dQ: "+3.2pp", dY: "+7.4pp" }, risk: { v: "6",  d30: "-1", dQ: "-2", dY: "-4" },  fresh: { v: "4",  d30: "+1", dQ: "+2",  dY: "+3" },  resp: { v: "66%", d30: "+1.1pp", dQ: "+2.5pp", dY: "+5.2pp" } },
  partners:  { label: "Partners",  active: { v: "34",  d30: "+1",  dQ: "+3",  dY: "+5" },   comp: { v: "91%", d30: "+0.8pp", dQ: "-1.4pp", dY: "+3.8pp" }, risk: { v: "1",  d30: "0",  dQ: "-1", dY: "-2" },  fresh: { v: "1",  d30: "+1", dQ: "+1",  dY: "+2" },  resp: { v: "74%", d30: "+0.7pp", dQ: "+1.9pp", dY: "+4.1pp" } },
  vendors:   { label: "Vendors",   active: { v: "48",  d30: "+1",  dQ: "+5",  dY: "+9" },   comp: { v: "88%", d30: "+1.0pp", dQ: "+2.1pp", dY: "+4.4pp" }, risk: { v: "1",  d30: "0",  dQ: "0",  dY: "-1" },  fresh: { v: "1",  d30: "+1", dQ: "+2",  dY: "+3" },  resp: { v: "70%", d30: "+0.9pp", dQ: "+1.7pp", dY: "+3.6pp" } },
};

/* maps a segment id (contact category) to its REL_DATA key */
export const SEG_KEY: Record<string, string> = { all: "all", client: "clients", prospect: "prospects", sphere: "sphere", partner: "partners", vendor: "vendors" };

/* ---- Delta cell colouring (deltaCell ~1026) ---- */
export function deltaCell(period: string, txt: string, inv = false): { period: string; disp: string; color: string } {
  const na = txt === "—" || txt === "" || txt == null;
  const neg = /^[-−]/.test(txt);
  const pos = /^\+/.test(txt);
  const good = inv ? neg : pos;
  const bad = inv ? pos : neg;
  const color = na ? "#B8B8B8" : bad ? "#D0342C" : good ? "#10A37F" : "#5D5D5D";
  return { period, disp: (na ? "" : neg ? "↓" : pos ? "↑" : "") + String(txt).replace("pp", ""), color };
}

/* ---- Segments + columns ---- */
export const SEGMENTS: Array<[string, string]> = [["All", "all"], ["Clients", "client"], ["Prospects", "prospect"], ["Sphere", "sphere"], ["Partners", "partner"], ["Vendors", "vendor"]];
export const BASE_COLS: Array<[string, string]> = [["Name", "name"], ["Relationship", "relationship"], ["Location", "location"], ["Active", "active"], ["Lifetime GCI", "lifetime"], ["Last Touch", "lastTouch"]];
export const EXTRA_COL_DEFS: Array<[string, string]> = [["Tags", "tags"], ["Status", "status"], ["Phone", "phone"], ["Email", "email"], ["Client Since", "since"], ["Deals Won", "dealsWon"], ["Category", "category"], ["Preferred Asset", "prefAsset"], ["Budget Range", "prefBudget"]];

/* ---- Touch Today queue (queueRaw ~2265, literal) ---- */
export interface QueueItem {
  id: string; name: string; status: string; cycle: string; clock: string; overdue: boolean;
  ctx: string; wgci: string; draft: boolean; best?: string; min: number; mode: string; channel: string; signal?: string;
  brief: { last: string; goal: string; draft: string };
}
export const TOUCH_QUEUE: QueueItem[] = [
  { id: "q1", name: "Marcelo Carvalho", status: "HOT", cycle: "3d", clock: "Day 4 of 3", overdue: true, ctx: "Confirm 2nd visit · send developer construction schedule", wgci: "$412K", draft: true, best: "17–19h BRT", min: 8, mode: "You", channel: "Call", signal: "↗ replied 2× faster this week",
    brief: { last: "Toured PH-A Sat with spouse — loved layout, concern on construction timeline", goal: "Confirm 2nd visit + hand over developer schedule (attached)", draft: '"Marcelo, consegui o cronograma oficial da obra — 3 pontos que respondem a preocupação da Fernanda. Te ligo às 17h?"' } },
  { id: "q2", name: "Family Office · Zurich", status: "HOT", cycle: "3d", clock: "Day 3 of 3", overdue: false, ctx: "Counter pending since Thu — push principal call before Wed", wgci: "$288K", draft: true, best: "08–10h CET", min: 10, mode: "You", channel: "Call",
    brief: { last: "Counter open since Thursday — Keller reviewing with principal", goal: "Force the principal call before Wednesday — offer two windows", draft: '"Anton — the seller is entertaining a second party Thursday. Can we get the principal on for 15 minutes tomorrow 8-10h your time?"' } },
  { id: "q3", name: "R. Sterling", status: "HOT", cycle: "3d", clock: "Day 2 of 3", overdue: false, ctx: "Financing approved — schedule decisive tour vs Estates", wgci: "$196K", draft: true, best: "12–14h EST", min: 6, mode: "You", channel: "WhatsApp", signal: "↗ opened tour report 3× yesterday",
    brief: { last: "Financing approved Jul 03 — still comparing vs Estates unit", goal: "Lock the decisive tour this week — inspection window closes Jul 08", draft: '"Robert — both units available Thursday afternoon. One visit, side by side, and you decide. 2pm?"' } },
  { id: "q4", name: "Coral Gables buyer", status: "WARM", cycle: "7d", clock: "Day 11 of 7", overdue: true, ctx: "3 unanswered touches — re-engage with new angle (agent suggests downgrade)", wgci: "$96K", draft: true, min: 4, mode: "Assisted", channel: "WhatsApp",
    brief: { last: "3 unanswered touches over 11 days", goal: "One last angle (new inventory) — if silent, approve downgrade to agent-run", draft: '"Saiu uma unidade nova no perfil que você procurava — quer que eu segure antes de abrir ao mercado?"' } },
  { id: "q5", name: "D. Nakamura", status: "WARM", cycle: "7d", clock: "Day 6 of 7", overdue: false, ctx: "Bal Harbour 1503 closing Jul 18 — pre-closing check-in", wgci: "$400K", draft: false, min: 5, mode: "You", channel: "Call",
    brief: { last: "Clean transaction — appraisal in, closing Jul 18", goal: "Pre-closing reassurance call — walk-through logistics", draft: "" } },
  { id: "q6", name: "A. Bittencourt", status: "PAST", cycle: "90d", clock: "Day 94 of 90", overdue: true, ctx: "WON 94 days ago, no referral ask — draft prepared", wgci: "—", draft: true, min: 3, mode: "Assisted", channel: "WhatsApp",
    brief: { last: "7 referrals lifetime — none asked in 94 days", goal: "Warm referral ask + retribute (Zurich FO attorney intro)", draft: '"Ana — te devo uma. Tenho uma introdução que vale seu tempo, e uma pergunta: quem mais da sua rede deveria estar olhando Miami agora?"' } },
  { id: "q7", name: "V. Petrov", status: "PAST", cycle: "90d", clock: "Day 61 of 90", overdue: false, ctx: "Anniversary of Sunny Isles purchase Aug 02 — gesture proposed", wgci: "—", draft: false, min: 2, mode: "Run", channel: "WhatsApp",
    brief: { last: "Purchase anniversary Aug 02 — agent proposes a gesture", goal: "Approve the gesture — agent executes end to end", draft: "" } },
];

/* ---- Google Contacts sync · triage banner (gcFields ~2418, literal) ---- */
export const GC_BANNER = {
  name: "Isabela Fontes",
  line: "Isabela Fontes · isabela.fontes@fontesgroup.com · +55 21 9 7712 ···· — held outside the pipeline until you classify it",
};

/* ---- Per-contact open tasks (contactTasks ~2379, literal) — peek drawer ---- */
export const CONTACT_TASKS: Record<string, Array<{ t: string; due: string }>> = {
  marcelo: [{ t: "Send developer construction schedule", due: "Jul 08" }, { t: "Confirm second visit", due: "Jul 06" }],
  keller: [{ t: "Push principal call before Wednesday", due: "Jul 07" }],
  sterling: [{ t: "Confirm inspection report receipt", due: "Jul 08" }],
  bittencourt: [{ t: "Send referral re-engagement note", due: "Jul 09" }],
  zanotti: [{ t: "Open cross-sell conversation on waterfront lot", due: "Jul 15" }],
  nakamura: [{ t: "Follow up on open offer", due: "Jul 12" }],
  ravel: [{ t: "Submit HOA approval package", due: "Jul 11" }],
  alvarez: [{ t: "Confirm appraisal receipt", due: "Jul 18" }],
};

/* ---- Per-contact recent touches (contacts[].touches ~2153, literal) — peek ---- */
export const CONTACT_TOUCHES: Record<string, Array<{ date: string; type: string; body: string }>> = {
  marcelo: [
    { date: "Jul 04", type: "Showing", body: "Toured PH-A with spouse. Strong response to layout; open concern on construction timeline." },
    { date: "Jul 02", type: "WhatsApp", body: "Shared developer brochure and finish schedule." },
    { date: "Jun 14", type: "Note", body: "Referral introduction via A. Bittencourt." },
  ],
  keller: [
    { date: "Jul 03", type: "Call", body: "Reviewed counter terms; principal availability next week." },
    { date: "Jun 26", type: "Email", body: "Sent comparative valuation on two compounds." },
  ],
  sterling: [
    { date: "Jul 03", type: "Call", body: "Confirmed financing; scheduling final tour." },
    { date: "Jun 21", type: "Note", body: "Comparing Acqualina vs Estates unit." },
  ],
  bittencourt: [
    { date: "Jun 30", type: "Note", body: "Introduced Marcelo Carvalho; thanked and kept warm." },
    { date: "Apr 12", type: "Meeting", body: "Coffee in São Paulo; discussed two upcoming buyers." },
  ],
  zanotti: [{ date: "Dec 2024", type: "Note", body: "Annual check-in; mentioned waterfront lot holding." }],
  nakamura: [{ date: "Jul 01", type: "Email", body: "Submitted offer package; awaiting counter." }],
  ravel: [{ date: "Jun 28", type: "Showing", body: "Second viewing of Faena 8C; positive on finishes." }],
  alvarez: [{ date: "Jul 02", type: "Call", body: "Confirmed appraisal ordered; close on track for Jul 18." }],
  delgado: [
    { date: "Jul 01", type: "Email", body: "Sterling HOA package — legal review returned same day." },
    { date: "Jun 12", type: "Call", body: "Alvarez contract — rider language agreed." },
  ],
  coastal: [{ date: "Jun 30", type: "Email", body: "Chased Ravel title commitment — no response yet." }],
  katz: [{ date: "Jun 22", type: "WhatsApp", body: "Shared feedback on Acqualina 4805 showing." }],
  itau: [{ date: "May 28", type: "Meeting", body: "Coffee — discussed referral flow both ways." }],
};
