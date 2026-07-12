/* Partner (Referral Partner view-as) reference data — copied literally from
   logic-and-data.js (ptKpis ~3849, feeBars ~3809, valRows ~3812, ptRows ~3860,
   cardDefs ~3642, ptProjects ~3768). Partner = A. Bittencourt. */

export const PT_NAME = "A. Bittencourt";

export const PT_KPIS: Array<{ label: string; value: string; note: string }> = [
  { label: "Referred", value: "4", note: "lifetime · 3 active files" },
  { label: "Referred volume", value: "$44.7M", note: "in motion now" },
  { label: "Your share — in motion", value: "$335K", note: "25% of Gross Commission · projected + payable" },
  { label: "Paid to date", value: "$48K", note: "last: Dec 2025 · Setai 1201" },
];

export const FEE_BARS: Array<{ label: string; v: string; w: string; c: string }> = [
  { label: "Projected", v: "$281.3K", w: "100%", c: "#B45309" },
  { label: "Payable", v: "$54.0K", w: "19%", c: "#0D0D0D" },
  { label: "Paid", v: "$48.0K", w: "17%", c: "#10A37F" },
];
export const OUTCOME_BARS: Array<{ label: string; n: string; w: string }> = [
  { label: "Active files", n: "2", w: "100%" }, { label: "In closing", n: "1", w: "50%" },
  { label: "Paid", n: "1", w: "50%" }, { label: "Pending ack", n: "1", w: "50%" }, { label: "Declined — duplicate", n: "1", w: "50%" },
];
export const CONV_LINE = "Conversion 80% · median referral-to-close 94 days · 0 disputes";

export const VAL_ROWS: Array<{ name: string; deal: string; reg: string; ends: string; left: string; pw: string; st: string; c: string }> = [
  { name: "Marcelo Carvalho", deal: "Rivage · PH-A", reg: "Jun 21, 2026", ends: "Jun 21, 2027", left: "346 days left", pw: "5%", st: "Active", c: "#0D0D0D" },
  { name: "Bianca Ferraz", deal: "Golden Beach Villa", reg: "May 30, 2026", ends: "May 30, 2027", left: "324 days left", pw: "11%", st: "Active", c: "#0D0D0D" },
  { name: "Miguel Alvarez", deal: "Continuum 2904", reg: "Feb 02, 2026", ends: "Feb 02, 2027", left: "207 days left", pw: "43%", st: "Contract signed — fee locked (§4.3)", c: "#10A37F" },
  { name: "D. Rosen", deal: "awaiting first file", reg: "Jul 07, 2026", ends: "Jul 07, 2027", left: "362 days left", pw: "1%", st: "Acknowledgment window", c: "#B45309" },
  { name: "R. Almeida", deal: "Setai 1201", reg: "Sep 2025", ends: "closed Nov 2025", left: "—", pw: "100%", st: "Closed within validity ✓", c: "#10A37F" },
];

export const PT_ROWS: Array<{ deal: string; base: string; share: string; stText: string; stColor: string; when: string }> = [
  { deal: "Rivage · PH-A", base: "$555K", share: "$138.8K", stText: "Projected", stColor: "#B45309", when: "Sep 2026" },
  { deal: "Golden Beach Villa", base: "$570K", share: "$142.5K", stText: "Projected", stColor: "#B45309", when: "Q4 2026" },
  { deal: "Continuum 2904", base: "$216K", share: "$54.0K", stText: "Payable at closing", stColor: "#0D0D0D", when: "Jul 18, 2026" },
  { deal: "Setai 1201", base: "$192K", share: "$48.0K", stText: "Paid ✓", stColor: "#10A37F", when: "Dec 12, 2025" },
];
export const PT_TOTAL_LINE = "Lifetime $383.3K · $48.0K paid · $335.3K in motion";

/* Portal pipeline cards (cardDefs ~3642) */
export interface PtCard { id: string; title: string; lead: string; kind: string; next: string; fee: string; feeSt: string; feeColor: string; feeWhen: string; col: number; docs: Array<[string, string]> }
export const PT_CARDS: PtCard[] = [
  { id: "rivage", title: "Rivage · PH-A", lead: "Marcelo C.", kind: "Acquisition · $18.5M", next: "Second visit — Sat 11:00", fee: "$138.8K", feeSt: "projected", feeColor: "#B45309", feeWhen: "at closing · Sep 2026", col: 0, docs: [["Pre-referral registration", "Timestamped Jun 21 · protection active"], ["Referral agreement — 25% of Gross Commission", "Signed · on file"]] },
  { id: "golden", title: "Golden Beach Villa", lead: "Bianca F.", kind: "Listing · $19M", next: "Launch — broker open in week one", fee: "$142.5K", feeSt: "projected", feeColor: "#B45309", feeWhen: "at closing · Q4 2026", col: 0, docs: [["Pre-referral registration", "Timestamped May 30 · protection active"], ["Referral agreement — 25% of Gross Commission", "Signed · on file"]] },
  { id: "continuum", title: "Continuum 2904", lead: "Miguel A.", kind: "Acquisition · $7.2M", next: "Closing — Jul 18", fee: "$54.0K", feeSt: "payable", feeColor: "#0D0D0D", feeWhen: "disburses at closing · Jul 18", col: 1, docs: [["Referral agreement — 25% of Gross Commission", "Signed · on file"], ["Fee statement — $54.0K", "Issues at closing · Jul 18"]] },
  { id: "setai", title: "Setai 1201", lead: "R. Almeida", kind: "Acquisition · closed Dec 2025", next: "—", fee: "$48.0K", feeSt: "paid", feeColor: "#10A37F", feeWhen: "wired Dec 12, 2025", col: 2, docs: [["Fee statement — $48.0K", "Paid · Dec 12, 2025"], ["Wire receipt", "Dec 12, 2025"]] },
];
export const PT_COLS = [{ title: "In progress", ids: [0] }, { title: "Closing", ids: [1] }, { title: "Paid", ids: [2] }];

/* Referral record (14) — per-card track, milestones, history, notes (cardDefs ~3642) */
const T_BUY = ["Qualified", "Toured", "Offer strategy", "Negotiation", "Contract", "Escrow", "Closing"];
const T_LIST = ["Consult", "Valuation", "Agreement", "Prep & staging", "Marketing", "Offers", "Contract", "Closing"];
export interface PtRecord {
  track: string[]; idx: number; prot: string; protColor: string;
  nums: Array<{ label: string; value: string; note: string }>;
  hl: Array<[string, string]>; miles: Array<[string, string, string]>;
  tcMiles?: Array<[string, string, string]>; comments: Array<[string, string, string]>;
}
export const PT_RECORD: Record<string, PtRecord> = {
  rivage: { track: T_BUY, idx: 2, prot: "Protected to Jun 2027 · 346 days", protColor: "#0D0D0D",
    nums: [{ label: "Referred value", value: "$18.5M", note: "Rivage PH-A · acquisition" }, { label: "Your share", value: "$138.8K", note: "projected · at closing Sep 2026" }, { label: "Base GCI", value: "$555K", note: "3% of value" }],
    hl: [["Jul 05", "Toured PH-A + PH-B with spouse — strong response"], ["Jul 03", "Offer strategy approved · ceiling set"], ["Jun 28", "Proof of funds filed — cash acquisition"], ["Jun 21", "Your referral registered · protection active"]],
    miles: [["Jul 08", "Construction schedule to client", "done"], ["Jul 12", "Second visit — Sat 11:00", "next"], ["Jul 20", "Contract target — developer paper", "future"]],
    comments: [["A. Bittencourt", "Jul 04", "Marcelo values discretion — avoid e-mail, WhatsApp only."], ["Wictor", "Jul 04", "Noted — the whole thread runs on WhatsApp. Good instinct."]] },
  golden: { track: T_LIST, idx: 3, prot: "Protected to May 2027 · 324 days", protColor: "#0D0D0D",
    nums: [{ label: "Referred value", value: "$19M", note: "Golden Beach Villa · listing" }, { label: "Your share", value: "$142.5K", note: "projected · at closing Q4 2026" }, { label: "Base GCI", value: "$570K", note: "3% of value" }],
    hl: [["Jul 08", "Stager confirmed Thursday · photos Monday"], ["Jul 03", "Exclusive signed — launch week set"], ["Jun 26", "Walkthrough — positioning aligned"]],
    miles: [["Jul 10", "Staging complete", "next"], ["Jul 14", "Photography + floor plans", "future"], ["Jul 17", "MLS live + broker open invites", "future"]],
    comments: [] },
  continuum: { track: T_BUY, idx: 6, prot: "Contract signed — fee locked (§4.3)", protColor: "#10A37F",
    nums: [{ label: "Referred value", value: "$7.2M", note: "Continuum 2904 · acquisition" }, { label: "Your share", value: "$54.0K", note: "payable · disburses at closing Jul 18" }, { label: "Base GCI", value: "$216K", note: "3% of value" }],
    hl: [["Jul 06", "Walk-through scheduled · wire verified"], ["Jul 02", "Financing cleared — all contingencies met"]],
    miles: [["Jul 16", "Final walk-through", "next"], ["Jul 18", "Closing · your fee disburses", "future"]],
    tcMiles: [["Contract signed", "Jul 02", "done"], ["Inspection cleared", "Jul 06", "done"], ["HOA approval", "Jul 10", "done"], ["Final walk-through", "Jul 16", "current"], ["Closing", "Jul 18", "future"], ["Your fee disburses", "Jul 18", "future"]],
    comments: [["Wictor", "Jul 06", "Clean file — no financing contingency left. Expect the wire same day."]] },
  setai: { track: T_BUY, idx: 7, prot: "Closed within validity ✓", protColor: "#10A37F",
    nums: [{ label: "Referred value", value: "$6.4M", note: "Setai 1201 · closed Dec 2025" }, { label: "Your share", value: "$48.0K", note: "paid · wired Dec 12, 2025" }, { label: "Base GCI", value: "$192K", note: "3% of value" }],
    hl: [["Dec 12", "Referral fee wired — $48.0K"], ["Nov 30", "Closed · 94 days referral-to-close"]],
    miles: [["Dec 12", "Fee wired ✓", "done"]],
    comments: [] },
};

/* Collaterals (ptProjects ~3768) */
export const PT_PROJECTS: Array<{ name: string; loc: string; from: string; del: string; st: string; stC: string; upd: string }> = [
  { name: "Rivage", loc: "Bal Harbour — oceanfront", from: "from $8.5M", del: "Delivery Q4 2026", st: "Selling", stC: "#0D0D0D", upd: "updated Jul 08" },
  { name: "St Regis Sunny Isles · Tower 2", loc: "Sunny Isles Beach", from: "from $4.9M", del: "Delivery 2027", st: "Price release Aug 1", stC: "#B45309", upd: "updated Jul 09" },
  { name: "Bentley Residences", loc: "Sunny Isles Beach", from: "from $5.6M", del: "Delivery 2028", st: "Selling", stC: "#0D0D0D", upd: "updated Jul 02" },
  { name: "The Perigon", loc: "Miami Beach — oceanfront", from: "from $4.2M", del: "Delivery 2027", st: "Last 20%", stC: "#D0342C", upd: "updated Jun 30" },
  { name: "Villa Miami", loc: "Edgewater — waterfront", from: "from $5.0M", del: "Delivery 2027", st: "Selling", stC: "#0D0D0D", upd: "updated Jul 05" },
  { name: "Estates at Acqualina", loc: "Sunny Isles Beach", from: "from $6.8M", del: "Move-in ready", st: "Developer units", stC: "#10A37F", upd: "updated Jul 07" },
];
export const KITS = ["Brochure", "Fact sheet", "Floor plans", "Price list"];
