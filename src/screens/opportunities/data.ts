/* Opportunities / Pipeline reference data — copied literally from
   design-reference/logic-and-data.js (mkCard ~1220, pipes ~1232, closedRows
   ~1211, oppDeltas ~1441, buildPeekData ~1541, pipeRefRows ~3777). The pipeline
   demo data is the prototype seed for this screen. */
import type { Pipeline } from "../../domain/types";

const MONTH_IDX: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

export interface Card {
  name: string; opp: string; budget: string; status: "HOT" | "WARM"; prob: string; dot: string;
  next: string; due: string; dueColor: string; budgetNum: number; probNum: number; weightedNum: number; dueRank: number;
  stage?: string; pipeName?: string; tags?: string[];
  /* Set when the card is backed by a real Opportunity record (vs demo seed). */
  id?: string; pipeKey?: string;
}

/* Parse a budget string to MILLIONS (the unit the card/GCI math expects).
   Handles suffixes ($6.8M, $950K, $1.2B) AND bare full-dollar amounts the user
   may type ("3700000" → 3.7). Bare numbers ≥1000 are read as raw dollars (÷1e6);
   smaller bare numbers ("3.7", "12") are already millions. Monthly rents keep the
   caller's convention and are handled separately in mkCard. */
export function parseBudgetM(b?: string): number {
  if (!b) return 0;
  const s = String(b);
  const num = parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  if (!num) return 0;
  if (/b/i.test(s)) return num * 1000;
  if (/k/i.test(s)) return num / 1000;
  if (/m/i.test(s)) return num;
  return num >= 1000 ? num / 1e6 : num; // bare: large → raw dollars, small → millions
}

/* Canonical display for a budget: $X.XB / $X.XM / $XK (preserves "/mo" rents). */
export function fmtBudget(b?: string): string {
  if (!b) return "—";
  const mo = /\/mo/i.test(String(b)) ? "/mo" : "";
  const m = parseBudgetM(b);
  if (!m) return String(b);
  if (m >= 1000) return `$${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)}B${mo}`;
  if (m >= 1) return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M${mo}`;
  return `$${Math.round(m * 1000)}K${mo}`;
}

export function mkCard(name: string, opp: string, budget: string, hot: boolean, prob: number, next: string, due: string, overdue: boolean): Card {
  // Rents keep their $K/mo magnitude (peek shows it as one month); sales convert to millions.
  const budgetNum = /\/mo/i.test(String(budget))
    ? (parseFloat(String(budget).replace(/[^0-9.]/g, "")) || 0)
    : parseBudgetM(budget);
  const parts = String(due).split(" ");
  const dueRank = (MONTH_IDX[parts[0]] ?? 12) * 31 + (parseInt(parts[1], 10) || 0);
  return { name, opp, budget, status: hot ? "HOT" : "WARM", prob: prob + "%", dot: hot ? "#0D0D0D" : "#8F8F8F", next, due, dueColor: overdue ? "#D0342C" : "#5D5D5D", budgetNum, probNum: prob, weightedNum: (budgetNum * prob) / 100, dueRank };
}

/* Unified deal status (drives the board columns + cadence). A deal's status is
   like a contact's classification: pick one → the agent arms the cadence + next
   action. Any legacy/seed stage normalizes into one of these five. */
export const DEAL_STATUS = ["Prospecting", "Warm", "Hot", "Won", "Lost"] as const;
export function normStatus(stage?: string): string {
  const s = (stage ?? "").toLowerCase();
  if (/won|placed|closed/.test(s)) return "Won";
  if (/lost/.test(s)) return "Lost";
  if (/hot|contract|negotiat|offer/.test(s)) return "Hot";
  if (/warm|qualif|nurtur/.test(s)) return "Warm";
  return "Prospecting";
}
/* Cadence + first next-action per status (defaults; Settings §02 can override
   per canonical status name). */
export const DEAL_PLAY: Record<string, { cadence: string; next: string }> = {
  Prospecting: { cadence: "Every 3 days", next: "Qualify budget, timeline & motivation" },
  Warm: { cadence: "Weekly", next: "Send a curated set · advance the search" },
  Hot: { cadence: "Every 2 days", next: "Push to offer / contract — close the next step" },
  Won: { cadence: "Quarterly", next: "Post-sale: referral ask + anniversary gesture" },
  Lost: { cadence: "Quarterly", next: "Nurture — watch for re-entry signals" },
};
export const DEFAULT_LOSS_REASONS = ["Price / valuation gap", "Timeline / delivery", "Chose competitor", "Financing fell through", "Went quiet", "Other"];

export interface Column { stage: string; cards: Card[] }
const col = (stage: string, cards: Card[]): Column => ({ stage, cards });

export const PIPE_NAMES: Record<string, string> = { purchases: "Purchases", listings: "Listings", rentals: "Rentals", investments: "Investments", offmarket: "Off-Market" };

/* Opportunity type + its closing flow. `status` (Prospecting→…→Lost) is the
   qualification heat that buckets the board; the FLOW below is the type-specific
   path to close (a purchase closes differently than a listing or a lease). The
   Deal Detail tracks the flow stage independently of the heat. */
export type DealTypeDef = { label: string; side: string; flow: string[] };
export const DEAL_TYPES: Record<Pipeline, DealTypeDef> = {
  purchases:   { label: "Purchase",   side: "Buyer side",       flow: ["Prospect", "Qualified", "Touring", "Offer", "Negotiation", "Under Contract", "Closing", "Closed"] },
  listings:    { label: "Listing",    side: "Seller side",      flow: ["Prospect", "Listing Prep", "Live · Marketing", "Showings", "Offer", "Under Contract", "Closing", "Closed"] },
  rentals:     { label: "Rental",     side: "Tenant / Owner",   flow: ["Prospect", "Qualified", "Showings", "Application", "Lease Out", "Placed"] },
  investments: { label: "Investment", side: "Capital division", flow: ["Sourcing", "Underwriting", "LOI", "Due Diligence", "Under Contract", "Closed"] },
  offmarket:   { label: "Off-Market", side: "Pocket listing",   flow: ["Registered", "Matched", "Showing", "Offer", "Under Contract", "Closed"] },
};
export function dealTypeOf(pipeline?: string): DealTypeDef { return DEAL_TYPES[(pipeline as Pipeline)] ?? DEAL_TYPES.purchases; }
/* Current index in the type's flow (case-insensitive match; -1 → 0). */
export function flowIndex(pipeline: string | undefined, flowStage?: string): number {
  const flow = dealTypeOf(pipeline).flow;
  const i = flow.findIndex((s) => s.toLowerCase() === (flowStage ?? "").toLowerCase());
  return i >= 0 ? i : 0;
}

/* Next-deal loop (Deal Detail all-clear): every open deal across pipelines,
   ranked by weighted GCI — the natural work queue. nextDealAfter wraps around. */
export interface QueuedDeal { name: string; stage: string; status: "HOT" | "WARM"; budget: string; prob: string; opp: string; weightedNum: number }
const CLOSED_STAGES = new Set(["Won", "Lost", "Placed"]);
export function orderedDeals(): QueuedDeal[] {
  return (["purchases", "listings", "rentals", "investments", "offmarket"] as const)
    .flatMap((p) => PIPES[p].flatMap((c0) => (CLOSED_STAGES.has(c0.stage) ? [] : c0.cards.map((c) => ({ name: c.name, stage: c0.stage, status: c.status, budget: c.budget, prob: c.prob, opp: c.opp, weightedNum: c.weightedNum })))))
    .sort((a, b) => b.weightedNum - a.weightedNum);
}
export function nextDealAfter(name: string): QueuedDeal | null {
  const all = orderedDeals();
  if (all.length === 0) return null;
  const i = all.findIndex((d) => d.name === name);
  return i < 0 ? all[0] : all[(i + 1) % all.length];
}

export const PIPES: Record<string, Column[]> = {
  purchases: [
    col("Prospecting", [mkCard("Continuum South 3902", "Buyer inquiry", "$6.8M", false, 20, "Qualify budget + timeline", "Jul 09", false), mkCard("Continuum North 1801", "Buyer", "$5.4M", false, 30, "Send parking + HOA docs", "Jul 09", false)]),
    col("Warm", [mkCard("St Regis SI · Tower 2 PH · Sasson", "Buyer · Pre-construction", "$29M", true, 35, "Convert reservation — contract out", "Jul 09", false), mkCard("Faena House 12B", "Buyer", "$9.2M", false, 30, "Send curated 3-unit set", "Jul 07", false), mkCard("Acqualina 4805", "Buyer", "$10.6M", false, 35, "Follow up post-tour", "Jul 10", false), mkCard("Bal Harbour 2201", "Buyer", "$7.5M", false, 35, "Confirm financing letter", "Jul 08", false)]),
    col("Hot", [mkCard("Estates at Acqualina 5601", "Buyer", "$16M", true, 40, "Confirm Sat 11am tour", "Jul 06", false), mkCard("Rivage PH-A · Marcelo C.", "Buyer", "$18.5M", true, 45, "Send construction schedule", "Jul 08", false), mkCard("Faena Penthouse", "Buyer", "$34M", true, 50, "Await seller counter", "Jul 07", false)]),
    col("Under Contract", [mkCard("Sterling · Acqualina 4802", "Buyer", "$11.4M", true, 90, "Inspection ends Jul 08", "Jul 08", true), mkCard("Zurich FO · Golden Beach", "Buyer", "$28M", true, 60, "Push principal call", "Jul 07", false)]),
    col("Won", [mkCard("Continuum 2904 · Alvarez", "Buyer", "$7.2M", true, 100, "Closing Jul 18", "Jul 18", false)]),
    col("Lost", [mkCard("Brickell Commercial", "Buyer", "$14M", false, 40, "Probability downgraded", "Jul 11", false)]),
  ],
  listings: [
    col("Prospecting", [mkCard("Fisher Island Villa", "Seller lead", "$24M", false, 15, "Schedule listing consult", "Jul 10", false), mkCard("Indian Creek Estate", "Seller", "$52M", false, 25, "Prep valuation package", "Jul 12", false)]),
    col("Contract", [mkCard("Bal Harbour Listing", "Listing agreement", "$9.8M", false, 40, "Sign exclusive agreement", "Jul 09", false)]),
    col("Staging", [mkCard("Golden Beach Villa", "Staging", "$19M", true, 55, "Confirm stager schedule", "Jul 11", false)]),
    col("Marketing", [mkCard("Surfside Oceanfront", "Marketing", "$12.5M", true, 50, "Launch campaign + shoot", "Jul 08", false)]),
    col("Under Contract", [mkCard("Sunny Isles 3801", "Seller", "$8.2M", false, 60, "Re-forecast — close slipped", "Jun 30", true)]),
    col("Won", [mkCard("Portofino 2302 · Zanotti", "Seller", "$4.2M", true, 100, "Closed", "—", false)]),
    col("Lost", [mkCard("Brickell Loft", "Seller", "$3.9M", false, 30, "Withdrawn", "Jun 20", false)]),
  ],
  rentals: [
    col("Prospecting", [mkCard("Continuum Rental 3A", "Tenant", "$28K/mo", false, 30, "Qualify move-in date", "Jul 09", false), mkCard("Setai Suite 1802", "Tenant", "$22K/mo", false, 25, "Send 3 options", "Jul 10", false)]),
    col("Showings", [mkCard("Faena Residence 9B", "Tenant", "$45K/mo", true, 50, "Schedule viewing", "Jul 07", false)]),
    col("Contract", [mkCard("Bal Harbour 1801", "Lease", "$35K/mo", true, 70, "Draft lease", "Jul 08", false)]),
    col("Won", [mkCard("Edition 2204", "Lease", "$30K/mo", true, 100, "Keys handed", "—", false)]),
    col("Lost", [mkCard("Aria Rental 4B", "Tenant", "$18K/mo", false, 20, "Chose competitor", "Jun 28", false)]),
  ],
  investments: [
    col("Prospecting", [mkCard("Duarte Family", "Investor · yield-focused", "$15M", false, 20, "Present Doral industrial teaser", "Jul 10", false), mkCard("Sterling · redeploy proceeds", "Investor · post-closing", "$12M", false, 25, "Teaser: Brickell retail NNN", "Jul 12", false)]),
    col("Mandate", [mkCard("Zurich FO · 1031 mandate", "Investor · 45d clock day 31", "$41M", true, 65, "Phase II environmental due", "Jul 15", true)]),
    col("Presented", [mkCard("Itaú intro · Wexler FO", "Investor · core+", "$18M", false, 30, "Follow up on Coral Gables OM", "Jul 11", false)]),
    col("Underwriting", [mkCard("Miami River Dev Site · Katz JV", "Investor · covered land", "$24M", true, 45, "Counter on LOI terms", "Jul 09", false)]),
    col("Committed", [mkCard("Marchetti FO · Doral Industrial", "Investor · sale-leaseback", "$16M", true, 80, "PSA redline turn", "Jul 07", false)]),
    col("Won", [mkCard("Aventura Medical Office", "7.2% cap · closed May", "$14M", true, 100, "Quarterly LP report", "—", false)]),
  ],
  offmarket: [
    col("Quiet", [mkCard("Estates at Acqualina 3805", "Seller · Broker whisper · quiet", "$9.2M", false, 20, "2 buyer-book matches — owner reviewing previews", "Jul 11", false), mkCard("Golden Beach — Compound lot", "Seller · Attorney network · quiet", "$24M", false, 25, "1 match — assemble land dossier", "Jul 14", false), mkCard("Indian Creek parcel", "Seller · Family office · quiet", "$38M", false, 20, "Held 30d — owner pulse due", "Jul 09", false)]),
    col("Preview", [mkCard("Rivage PH-A", "Seller · Owner direct · quiet", "$18.9M", true, 40, "4 matches — 2 previews booked this week", "Jul 10", false)]),
    col("Circulating", [mkCard("Continuum South 1204", "Seller · Past client · quiet", "$6.4M", true, 55, "Whisper network live — 3 agent inquiries", "Jul 08", false)]),
    col("Placed", [mkCard("Surf Club — quiet placement", "Seller · Owner direct", "$11.2M", true, 100, "Converted to contract · May", "—", false)]),
  ],
};

/* stage tags (dealTagMap ~1326) */
const TAG_MAP: Record<string, string[]> = {
  "St Regis SI · Tower 2 PH · Sasson": ["Pre-construction", "Cash"], "Faena House 12B": ["Waterfront"], "Acqualina 4805": ["Waterfront"],
  "Continuum South 3902": ["Referral"], "Continuum North 1801": ["Waterfront"], "Fisher Island Villa": ["Off-market"],
  "Indian Creek Estate": ["Off-market", "Trophy"], "Bal Harbour Listing": ["Waterfront"],
};
export function tagsFor(c: Card): string[] {
  const s = ((c.name || "") + " " + (c.opp || "") + " " + (c.status || "")).toLowerCase();
  const out = TAG_MAP[c.name] ? TAG_MAP[c.name].slice() : [];
  if (/pre-construction|2028/.test(s) && !out.includes("Pre-construction")) out.push("Pre-construction");
  if (/cash/.test(s) && !out.includes("Cash")) out.push("Cash");
  if (/rental|\/mo/.test(s + (c.budget || ""))) out.push("Rental");
  if (/referral/.test(s) && !out.includes("Referral")) out.push("Referral");
  if (/off-market|whisper/.test(s) && !out.includes("Off-market")) out.push("Off-market");
  return out;
}

export const COLL_PIPES: Array<[string, string]> = [["All", "all"], ["Purchases", "purchases"], ["Listings", "listings"], ["Rentals", "rentals"], ["Investments", "investments"], ["Off-Market", "offmarket"], ["Closed", "closed"]];
export const SORT_DEFS: Array<[string, string]> = [["Weighted GCI", "weighted"], ["Budget", "budget"], ["Probability", "prob"], ["Next Action", "due"], ["Name", "name"]];
export const ALL_ORDER = ["Prospecting", "Warm", "Showings", "Quiet", "Preview", "Circulating", "Hot", "Mandate", "Presented", "Staging", "Marketing", "Underwriting", "Contract", "Committed", "Under Contract", "Placed", "Won", "Lost"];
export const WEEK_DAYS: Array<[string, string]> = [["Mon", "Jul 06"], ["Tue", "Jul 07"], ["Wed", "Jul 08"], ["Thu", "Jul 09"], ["Fri", "Jul 10"]];

/* report deltas per pipeline (oppDeltas ~1441) */
export const OPP_DELTAS: Record<string, Record<string, string[]>> = {
  all: { opps: ["+6", "+13", "+21"], value: ["+7.3%", "+19.1%", "+42.6%"], weighted: ["+6.8%", "+17.4%", "+39.0%"], gci: ["+6.4%", "+16.8%", "+38.4%"], win: ["+2pp", "+5pp", "+8pp"] },
  purchases: { opps: ["+3", "+7", "+11"], value: ["+8.1%", "+20.6%", "+45.2%"], weighted: ["+7.6%", "+18.9%", "+41.7%"], gci: ["+7.2%", "+18.1%", "+40.3%"], win: ["+3pp", "+6pp", "+9pp"] },
  listings: { opps: ["+2", "+4", "+6"], value: ["+5.9%", "+15.2%", "+33.8%"], weighted: ["+5.4%", "+13.8%", "+30.9%"], gci: ["+5.1%", "+13.2%", "+29.6%"], win: ["+1pp", "+4pp", "+7pp"] },
  rentals: { opps: ["+1", "+2", "+4"], value: ["+3.2%", "+8.4%", "+18.6%"], weighted: ["+2.9%", "+7.7%", "+17.1%"], gci: ["+2.7%", "+7.3%", "+16.2%"], win: ["+2pp", "+3pp", "+6pp"] },
  offmarket: { opps: ["+2", "+4", "+7"], value: ["+21.0%", "+34.2%", "+58.7%"], weighted: ["+19.4%", "+31.0%", "+52.3%"], gci: ["+18.6%", "+29.8%", "+50.1%"], win: ["+5pp", "+9pp", "+14pp"] },
  investments: { opps: ["+2", "+5", "+8"], value: ["+11.4%", "+26.3%", "+52.1%"], weighted: ["+10.6%", "+24.4%", "+48.7%"], gci: ["+10.1%", "+23.2%", "+46.5%"], win: ["+4pp", "+7pp", "+12pp"] },
};

/* Closed · won ledger (closedRows ~1211) */
export const CLOSED_HEAD = ["Deal", "Asset", "Closed", "Volume", "GCI", "Post-Sale"];
export const CLOSED_ROWS = [
  { name: "Bittencourt — Fisher Island 7D", asset: "Condo · Purchase", closed: "Apr 02", volume: "$21.5M", gci: "$645K", post: "Referral ask overdue · 94d", postColor: "#D0342C" },
  { name: "Nakamura — Bal Harbour 1503", asset: "Condo · Purchase", closed: "Mar 18", volume: "$13.3M", gci: "$400K", post: "Quarterly touch · due Jul 18", postColor: "#5D5D5D" },
  { name: "Petrov — Sunny Isles 3801", asset: "Condo · Purchase", closed: "Feb 07", volume: "$14.0M", gci: "$420K", post: "Anniversary gesture · Aug 02", postColor: "#5D5D5D" },
  { name: "Klein — Estates at Acqualina", asset: "Condo · Listing", closed: "Jan 22", volume: "$19.9M", gci: "$597K", post: "Owns unlisted waterfront · cross-sell", postColor: "#5D5D5D" },
  { name: "Duarte — Golden Beach Lot", asset: "Land · Purchase", closed: "Jan 09", volume: "$8.4M", gci: "$252K", post: "Referral received · reciprocate", postColor: "#5D5D5D" },
];

/* Partner referral pending (pipeRefRows ~3777) */
export const PIPE_REF = { id: "rosen", name: "D. Rosen", by: "A. Bittencourt", reg: "Jul 07", want: "Sunny Isles pre-construction · $4–6M · cash" };

/* Peek curated per-deal detail (buildPeekData curated ~1549) */
export interface PeekCurated { address: string; specs: string; ppsf: string; delivery: string; contacts: Array<[string, string]>; acts: Array<[string, string]>; dues: Array<[string, string]> }
export const PEEK_CURATED: Record<string, PeekCurated> = {
  "Rivage PH-A · Marcelo C.": { address: "Rivage Bal Harbour · PH-A", specs: "4 BD · 5.5 BA · 6,240 SF · full floor · private elevator", ppsf: "$2,965 / SF", delivery: "Pre-construction · delivery Q4 2027", contacts: [["Marcelo Carvalho", "Principal · buyer"], ["Sofia Duarte", "Developer sales · listing side"], ["R. Weiss", "Attorney · buyer side"]], acts: [["Jul 05", "Toured PH-A + PH-B — preferred the A stack"], ["Jul 03", "Offer strategy approved · $18.5M ceiling"], ["Jun 28", "Proof of funds filed · J.P. Morgan"]], dues: [["Send construction schedule", "Jul 08"], ["Deposit schedule review", "Jul 12"], ["Contract target", "Jul 20"]] },
  "Sterling · Acqualina 4802": { address: "Acqualina · Residence 4802", specs: "3 BD · 4.5 BA · 4,100 SF · flow-through", ppsf: "$2,780 / SF", delivery: "Under contract · closing Aug 15", contacts: [["R. Sterling", "Principal · buyer"], ["A. Gómez", "Listing agent · co-broke"], ["A/CO TC", "Transaction coordinator"]], acts: [["Jul 04", "Inspection scheduled Jul 07 · vendor confirmed"], ["Jun 27", "Escrow deposit confirmed · receipt filed"], ["Jun 24", "Contract effective · milestones instantiated"]], dues: [["Inspection period ends", "Jul 08"], ["HOA approval package", "Jul 11"], ["Closing", "Aug 15"]] },
  "Continuum 2904 · Alvarez": { address: "Continuum South Tower · 2904", specs: "3 BD · 3.5 BA · 2,910 SF · SE corner", ppsf: "$2,474 / SF", delivery: "Under contract · closing Jul 30", contacts: [["C. Alvarez", "Principal · buyer"], ["M. Torres", "Listing agent · co-broke"], ["First American", "Title & escrow"]], acts: [["Jul 02", "Appraisal came in at value — lender notified"], ["Jun 30", "Loan application complete · lender confirmed"], ["Jun 12", "Contract effective · milestones instantiated"]], dues: [["Clear to close", "Jul 23"], ["Walk-through", "Jul 28"], ["Closing", "Jul 30"]] },
};
