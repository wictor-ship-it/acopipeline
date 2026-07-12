/* Intelligence cockpit reference data — copied literally from
   design-reference/logic-and-data.js (hero/health ~460, heroSub ~397,
   proposals ~448, riskRows ~434, plays/intel ~2011, forecast fRaw ~476,
   deltas ~3340, agentLedger ~534). */

export const MORNING_BRIEF = "3 decisions · 5 touches · 1 risk — the agent logged 11 actions overnight";

export const HEALTH_SCORE = 82;
export const HEALTH_FACTORS: Array<{ label: string; value: string; w: string }> = [
  { label: "Coverage", value: "3.2×", w: "88%" },
  { label: "Velocity", value: "Good", w: "74%" },
  { label: "Aging", value: "Watch", w: "58%" },
  { label: "Hygiene", value: "Clean", w: "96%" },
];

export const MONEY_STRIP: Array<{ label: string; value: string; sub: string }> = [
  { label: "Pipeline", value: "$402M", sub: "42 open" },
  { label: "Weighted GCI", value: "$5.2M", sub: "probability-adj" },
  { label: "Closed YTD", value: "$3.1M", sub: "12 days ahead of pace" },
  { label: "Next 30 Days", value: "$1.34M", sub: "3 closings" },
];

export const HERO_SUB: Array<{ label: string; value: string; sub: string }> = [
  { label: "HOT Leads", value: "9", sub: "of 42" },
  { label: "Overdue Actions", value: "4", sub: "oldest 19d" },
  { label: "Win Rate · YTD", value: "38%", sub: "12 of 32" },
  { label: "Avg Deal Cycle", value: "64d", sub: "offer → close" },
  { label: "Referral Share", value: "58%", sub: "of new pipeline" },
  { label: "Agent · Overnight", value: "11", sub: "actions logged" },
];

export interface Proposal { id: string; label: string; body: string; why: string }
export const PROPOSALS: Proposal[] = [
  { id: "wa", label: "WhatsApp Draft · PT · Awaiting Approval", body: "Marcelo, bom dia. Confirmei a agenda de obra com a incorporadora — posso reservar sábado às 11h para a segunda visita da PH-A?", why: "Recommended: send — responds to the spouse's timeline concern while momentum is high." },
  { id: "down", label: "Status Proposal", body: "Coral Gables buyer: HOT → WARM. Three unanswered touches over 11 days.", why: "Recommended: approve — keeps your queue honest; contact stays in agent-run cadence." },
  { id: "merge", label: "Duplicate Merge", body: 'Two records for "R. Sterling / Robert Sterling" — Acqualina 4802. Merge into a single contact?', why: "Recommended: merge — histories are complementary, no field conflicts." },
];

export const RISK_ROWS: Array<{ lead: string; note: string }> = [
  { lead: "Bal Harbour Listing", note: "19 days since last touch — HOT threshold is 14." },
  { lead: "Brickell Commercial", note: "Probability 60% → 40% this week." },
  { lead: "Sunny Isles 3801", note: "Expected close was Jun 30, still in Negotiation → re-forecast." },
];

export const PLAYS: Array<{ idx: string; title: string; body: string }> = [
  { idx: "06", title: "Cluster Plays", body: "Four active buyers targeting the Acqualina / Rivage corridor — combined intent $61M. Proposed: an off-market sourcing sweep paired with a private preview event." },
  { idx: "07", title: "Cross-Sell", body: "Two clients own unlisted waterfront assets. Listing conversations suggested while relationships are warm." },
  { idx: "08", title: "Referral Mining", body: "Three WON relationships in the past 90 days without a referral ask — introduction drafts prepared." },
];

/* GCI forecast — 6 months (fRaw ~476) */
export interface ForecastMonth { m: string; deals: Array<{ n: string; v: number; slip?: boolean }> }
export const FORECAST: ForecastMonth[] = [
  { m: "JUL", deals: [{ n: "Continuum 2904 · Alvarez", v: 410 }, { n: "Faena 8C · Ravel", v: 530 }, { n: "Bal Harbour 1503 · Nakamura", v: 400 }] },
  { m: "AUG", deals: [{ n: "Sunny Isles 3801 · Petrov", v: 420 }] },
  { m: "SEP", deals: [{ n: "Marcelo · Rivage PH-A", v: 412, slip: true }, { n: "Zurich FO · Golden Beach", v: 504 }, { n: "Faena Penthouse", v: 460 }, { n: "Indian Creek Estate", v: 3020 }] },
  { m: "OCT", deals: [] },
  { m: "NOV", deals: [{ n: "Estates at Acqualina · Klein", v: 599 }] },
  { m: "DEC", deals: [{ n: "Fisher Island 6D", v: 180 }] },
];
export const fmtK = (k: number) => (k >= 1000 ? "$" + (k / 1000).toFixed(2).replace(/\.?0+$/, "") + "M" : k > 0 ? "$" + k + "K" : "$0");

export const WEEKLY_MOVEMENT = "The week added three qualified relationships, all within the Acqualina–Rivage corridor. Five deals advanced a stage, led by the Zurich family office moving Golden Beach into Negotiation. Two positions slipped: Sunny Isles 3801 missed its June 30 close and the Bal Harbour listing crossed the touch threshold. One dead relationship was retired after four unanswered outreaches. Net weighted GCI rose $310K on stronger probability in the Collection division.";
export const DELTAS: Array<{ label: string; value: string; color: string }> = [
  { label: "New", value: "+3", color: "#0D0D0D" },
  { label: "Advanced", value: "+5", color: "#0D0D0D" },
  { label: "Slipped", value: "2", color: "#D0342C" },
  { label: "Dead", value: "1", color: "#5D5D5D" },
  { label: "Weighted GCI Δ", value: "+$310K", color: "#0D0D0D" },
];

export const AGENT_LEDGER: Array<{ time: string; tag: string; text: string }> = [
  { time: "02:14", tag: "Captured", text: "Structured 3 WhatsApp threads into logs — Sterling, Ravel, Alvarez." },
  { time: "03:40", tag: "Sourced", text: "MLS sweep · 4 new matches for the Golden Beach buyer profile." },
  { time: "05:02", tag: "Sent", text: "Chase sent to Title Co. — commitment due Jul 22." },
  { time: "06:00", tag: "Prepared", text: "Morning brief assembled · 3 calls, 2 drafts ready for approval." },
];
