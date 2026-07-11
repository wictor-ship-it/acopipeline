/* =========================================================================
   Seed fixtures — the v5 prototype's demo data, mapped into the §8 domain
   model. Values copied literally from design-reference/logic-and-data.js
   (contacts ~2146, queue ~2265, transactions ~1159, activities ~3210,
   threads ~3262, referral portal ~3642, autonomy/cadence ~669-708).
   ========================================================================= */
import type {
  Activity, Contact, Draft, DocumentRef, Mandate, Message, Opportunity,
  Referral, Settings, Thread, Transaction, VaultEntry,
} from "../../domain/types";

/* ---------- Contacts (directory, 12) ---------- */
export const contacts: Contact[] = [
  {
    id: "marcelo", name: "Marcelo Carvalho", category: "client", status: "HOT",
    relationship: "Client · Buyer", location: "São Paulo, BR", language: ["PT"],
    phone: "+55 11 9 8842 ····", email: "m.carvalho@···", since: "2026",
    lifetime_gci: "$555K", deals_won: "0", active_deals: "1", last_touch: "Jul 04",
    tags: ["Ultra-HNW", "Cash buyer", "Referral"],
    preferences: { asset: "Penthouse condo", areas: "Sunny Isles · Bal Harbour", budget: "$15–20M" },
    referral_of: "bittencourt",
    narrative: "Introduced by A. Bittencourt. High-conviction cash buyer relocating part-time to Miami. Decisive once the family aligns; spouse weighs heavily on final call. Prefers privacy and off-market access.",
    agent_note: "Confirm the second Rivage visit before Wednesday — momentum is above the stated probability.",
  },
  {
    id: "keller", name: "Anton Keller", category: "prospect", status: "HOT",
    relationship: "Prospect · Family Office", location: "Zurich, CH", language: ["EN"],
    phone: "+41 44 ··· ····", email: "a.keller@zfo.ch", since: "2026",
    lifetime_gci: "—", deals_won: "0", active_deals: "1", last_touch: "Jul 03",
    tags: ["Family office", "Institutional", "Discreet"],
    preferences: { asset: "Waterfront compound", areas: "Golden Beach · Indian Creek", budget: "$25–30M" },
    narrative: "Represents a Zurich family office seeking a trophy waterfront compound. Process-driven; decisions require principal sign-off. Values discretion above speed.",
    agent_note: "Push a principal call before Wednesday — counter has been open since Thursday.",
  },
  {
    id: "sterling", name: "Robert Sterling", category: "client", status: "HOT",
    relationship: "Client · Buyer", location: "New York, US", language: ["EN"],
    phone: "+1 212 ··· ····", email: "r.sterling@···", since: "2025",
    lifetime_gci: "$196K", deals_won: "1", active_deals: "1", last_touch: "Jul 03",
    tags: ["Repeat client", "Cash buyer"],
    preferences: { asset: "Oceanfront condo", areas: "Sunny Isles", budget: "$10–12M" },
    narrative: "Repeat client, second acquisition. Financing approved but paying cash. Comparing the Acqualina unit against an Estates listing — leaning Acqualina on services.",
    agent_note: "Schedule the decisive tour this week; inspection window closes Jul 08.",
  },
  {
    id: "bittencourt", name: "Ana Bittencourt", category: "sphere", status: "SPHERE",
    relationship: "Sphere · Referrer", location: "Miami, US", language: ["PT", "EN"],
    phone: "+1 305 ··· ····", email: "ana@···", since: "2019",
    lifetime_gci: "$1.2M", deals_won: "7", active_deals: "0", last_touch: "Jun 30",
    tags: ["Top referrer", "Sphere", "Advocate"],
    preferences: {},
    pinned: { got: "7 referrals · $1.2M GCI", gave: "2 introductions", bal: "You owe", balColor: "#D0342C", move: "Zurich FO attorney intro + lunch in São Paulo" },
    narrative: "Longest-standing referral source. Introduced seven closed relationships since 2019, including Marcelo Carvalho. Warm, well-connected across São Paulo private capital.",
    agent_note: "No referral ask in 90 days — draft a warm re-engagement prepared.",
  },
  {
    id: "zanotti", name: "Valdemar Zanotti", category: "client", status: "PAST",
    relationship: "Client · Past", location: "Miami, US", language: ["PT", "EN"],
    phone: "+1 305 ··· ····", email: "v.zanotti@···", since: "2012",
    lifetime_gci: "$410K", deals_won: "1", active_deals: "0", last_touch: "2024",
    tags: ["Past client", "Advocate"],
    preferences: { asset: "Tower condo", areas: "Sunny Isles", budget: "$3–5M" },
    narrative: "Closed Portofino Tower #2302 in 2012. Loyal advocate and occasional referrer. Candidate for a cross-sell conversation on an unlisted waterfront asset.",
    agent_note: "Owns an unlisted waterfront asset — listing conversation suggested.",
  },
  {
    id: "nakamura", name: "Kenji Nakamura", category: "prospect", status: "WARM",
    relationship: "Prospect · Buyer", location: "Tokyo, JP", language: ["EN"],
    phone: "+81 3 ···· ····", email: "k.nakamura@···", since: "2026",
    lifetime_gci: "—", deals_won: "0", active_deals: "1", last_touch: "Jul 01",
    tags: ["Institutional", "Long horizon"],
    preferences: { asset: "Oceanfront condo", areas: "Bal Harbour", budget: "$8–10M" },
    narrative: "Represents a Tokyo holding company. Long decision horizon; values documentation and clear process. Offer submitted, awaiting counter.",
    agent_note: "Follow up on the open offer — response due this week.",
  },
  {
    id: "ravel", name: "Elena Ravel", category: "prospect", status: "WARM",
    relationship: "Prospect · Buyer", location: "Paris, FR", language: ["EN"],
    phone: "+33 1 ·· ·· ·· ··", email: "e.ravel@···", since: "2026",
    lifetime_gci: "—", deals_won: "0", active_deals: "1", last_touch: "Jun 28",
    tags: ["Design-led", "Discreet"],
    preferences: { asset: "Branded residence", areas: "Faena · Brickell", budget: "$8–10M" },
    narrative: "Design-led buyer drawn to branded residences. Responsive to curated, editorial presentation. In negotiation on the Faena unit.",
    agent_note: "HOA approval package pending — due Jul 11; keep momentum.",
  },
  {
    id: "alvarez", name: "Carlos Alvarez", category: "client", status: "WARM",
    relationship: "Client · Buyer", location: "Bogotá, CO", language: ["ES", "EN"],
    phone: "+57 1 ··· ····", email: "c.alvarez@···", since: "2025",
    lifetime_gci: "$410K", deals_won: "1", active_deals: "1", last_touch: "Jul 02",
    tags: ["Repeat client"],
    preferences: { asset: "Tower condo", areas: "Sunny Isles", budget: "$6–8M" },
    narrative: "Repeat buyer under contract on Continuum 2904. Appraisal pending; otherwise clean cash transaction.",
    agent_note: "Appraisal pending — confirm receipt before Jul 18 close.",
  },
  {
    id: "delgado", name: "M. Delgado", category: "vendor", status: "VENDOR",
    relationship: "Vendor · RE Attorney", location: "Miami, US", language: ["EN"],
    phone: "+1 305 ··· ····", email: "delgado@···law.com", since: "2021",
    lifetime_gci: "9 deals", deals_won: "9", active_deals: "2", last_touch: "Jul 01",
    tags: ["Attorney", "Top vendor", "96% on-time"],
    preferences: {},
    pinned: { got: "Legal cover on 9 closings", gave: "9 transactions of work", bal: "Even", balColor: "#5D5D5D", move: "Quarterly lunch — due this quarter", slaLine: "On pattern · 2h avg response · 96% on-time" },
    narrative: "Primary RE attorney. Nine transactions together — 96% on-time, 2h average response. Handles both A/CO sides when permitted.",
    agent_note: "Cadence: lunch due this quarter — 3 closings together this year.",
  },
  {
    id: "coastal", name: "Coastal Title Co.", category: "vendor", status: "SLIPPING",
    relationship: "Vendor · Title", location: "Miami, US", language: ["EN"],
    phone: "+1 305 ··· ····", email: "orders@coastal···", since: "2022",
    lifetime_gci: "7 deals", deals_won: "7", active_deals: "1", last_touch: "Jun 30",
    tags: ["Title", "SLA watch"],
    preferences: {},
    pinned: { got: "Title on 7 closings", gave: "7 orders", bal: "Watch", balColor: "#D0342C", move: "Chase today · reassess after this closing", slaLine: "Slipping · 26h response · 71% on-time" },
    narrative: "Title company on 7 transactions. SLA slipping — current commitment on day 7 of a usual 5. 71% on-time, 26h response.",
    agent_note: "Chase title commitment today — day 7 of usual 5. Consider First American for next contract.",
  },
  {
    id: "katz", name: "R. Katz", category: "partner", status: "PARTNER",
    relationship: "Partner · Co-broke", location: "Miami, US", language: ["EN"],
    phone: "+1 786 ··· ····", email: "rkatz@···", since: "2023",
    lifetime_gci: "$380K", deals_won: "4", active_deals: "1", last_touch: "Jun 22",
    tags: ["Co-broke", "Referral partner"],
    preferences: {},
    pinned: { got: "2 buyers", gave: "2 listings", bal: "Even", balColor: "#5D5D5D", move: "Coffee · July — off-market inventory swap" },
    narrative: "Co-broke partner across Sunny Isles inventory. Two buyers sent, two listings shared — relationship in balance and productive.",
    agent_note: "Coffee due this month — explore off-market inventory swap.",
  },
  {
    id: "itau", name: "Private Banker · Itaú Miami", category: "partner", status: "YOU OWE",
    relationship: "Partner · Private Bank", location: "Miami, US", language: ["PT", "EN"],
    phone: "+1 305 ··· ····", email: "—", since: "2024",
    lifetime_gci: "1 intro", deals_won: "1", active_deals: "0", last_touch: "May 28",
    tags: ["Private bank", "UHNW pipeline"],
    preferences: {},
    pinned: { got: "1 UHNW intro", gave: "0", bal: "You owe", balColor: "#D0342C", move: "Introduce the Duarte family — this month" },
    narrative: "Sent one UHNW introduction that became a client. Nothing reciprocated yet — balance pending on your side.",
    agent_note: "Reciprocate: introduce the Duarte family this month.",
  },
];

/* ---------- Mandates (buyer search briefs mirrored from the contact) ---------- */
export const mandates: Mandate[] = [
  { id: "m_marcelo", contact_id: "marcelo", text: "Penthouse condo · Sunny Isles · Bal Harbour · $15–20M · cash", active: true, updated_at: "2026-07-04" },
  { id: "m_keller", contact_id: "keller", text: "Waterfront compound · Golden Beach · Indian Creek · $25–30M", active: true, updated_at: "2026-07-03" },
  { id: "m_sterling", contact_id: "sterling", text: "Oceanfront condo · Sunny Isles · $10–12M · cash", active: true, updated_at: "2026-07-03" },
  { id: "m_nakamura", contact_id: "nakamura", text: "Oceanfront condo · Bal Harbour · $8–10M", active: true, updated_at: "2026-07-01" },
  { id: "m_ravel", contact_id: "ravel", text: "Branded residence · Faena · Brickell · $8–10M", active: true, updated_at: "2026-06-28" },
  { id: "m_alvarez", contact_id: "alvarez", text: "Tower condo · Sunny Isles · $6–8M", active: true, updated_at: "2026-07-02" },
];

/* ---------- Opportunities (pipeline items from each contact's active deal) ---------- */
export const opportunities: Opportunity[] = [
  { id: "opp_marcelo", contact_id: "marcelo", contact_name: "Marcelo Carvalho", pipeline: "purchases", stage: "Tour Completed", name: "Rivage PH-A", budget: "$18.5M", probability: 45, gci: "$412K", next_action: "Confirm 2nd visit · send developer schedule", next_due: "Jul 08", language: "PT", source: "Referral · A. Bittencourt", heat: "hot" },
  { id: "opp_keller", contact_id: "keller", contact_name: "Anton Keller", pipeline: "purchases", stage: "Negotiation", name: "Golden Beach Compound", budget: "$28M", probability: 40, gci: "$288K", next_action: "Force principal call before Wed", next_due: "Jul 09", language: "EN", heat: "hot" },
  { id: "opp_sterling", contact_id: "sterling", contact_name: "Robert Sterling", pipeline: "purchases", stage: "Under Contract", name: "Acqualina 4802", budget: "$11.4M", probability: 90, gci: "$196K", next_action: "Lock decisive tour this week", next_due: "Jul 08", language: "EN", heat: "hot" },
  { id: "opp_nakamura", contact_id: "nakamura", contact_name: "Kenji Nakamura", pipeline: "purchases", stage: "Offer Submitted", name: "Bal Harbour 1503", budget: "$9.8M", probability: 55, gci: "$400K", next_action: "Follow up on open offer", next_due: "Jul 12", language: "EN", heat: "warm" },
  { id: "opp_ravel", contact_id: "ravel", contact_name: "Elena Ravel", pipeline: "purchases", stage: "Negotiation", name: "Faena 8C", budget: "$9.2M", probability: 60, gci: "$96K", next_action: "HOA approval package — due Jul 11", next_due: "Jul 11", language: "EN", heat: "warm" },
  { id: "opp_alvarez", contact_id: "alvarez", contact_name: "Carlos Alvarez", pipeline: "purchases", stage: "Under Contract", name: "Continuum 2904", budget: "$7.2M", probability: 95, gci: "$410K", next_action: "Confirm appraisal before Jul 18 close", next_due: "Jul 18", language: "ES", heat: "warm" },
  { id: "opp_klein", contact_id: "zanotti", contact_name: "Klein", pipeline: "listings", stage: "Active Listing", name: "Estates at Acqualina PH", budget: "$19.9M", probability: 60, gci: "$498K", next_action: "Weekly seller report due", next_due: "Jul 08", language: "EN", heat: "warm" },
];

/* ---------- Transactions (In Contract table, ~1159) ---------- */
export const transactions: Transaction[] = [
  { id: "tx_sterling", opportunity_id: "opp_sterling", property: "Sterling — Acqualina 4802", client: "Robert Sterling", deal_type: "Purchase", status: "Under Contract", meta: "Under Contract · Cash · Effective Jun 24", milestones_label: "2 of 9 milestones", pct: "22%", next_peek: "HOA overdue", status_color: "#D0342C", gci: "$530K", close_date: "Closing Aug 15", budget: "$11.4M", probability: 90, milestones: [] },
  { id: "tx_alvarez", opportunity_id: "opp_alvarez", property: "Alvarez — Continuum 2904", client: "Carlos Alvarez", deal_type: "Purchase", status: "Under Contract", meta: "Under Contract · Financed · Effective Jun 12", milestones_label: "5 of 10 milestones", pct: "50%", next_peek: "On track", status_color: "#5D5D5D", gci: "$410K", close_date: "Closing Jul 30", budget: "$7.2M", probability: 95, milestones: [] },
  { id: "tx_ravel", opportunity_id: "opp_ravel", property: "Ravel — Faena 8C", client: "Elena Ravel", deal_type: "Purchase", status: "Under Contract", meta: "Under Contract · Cash · Effective Jun 28", milestones_label: "3 of 9 milestones", pct: "33%", next_peek: "T-3 · inspection", status_color: "#D0342C", gci: "$530K", close_date: "Closing Aug 22", budget: "$11.8M", probability: 90, milestones: [] },
  { id: "tx_chen", opportunity_id: "opp_chen", property: "Chen — Waldorf Astoria 5301", client: "Chen", deal_type: "Purchase", status: "Pre-construction", meta: "Pre-construction · Deposit schedule 10/10/10 · Delivery 2028", milestones_label: "1 of 3 deposits", pct: "33%", next_peek: "2nd deposit Aug 01", status_color: "#5D5D5D", gci: "$474K", close_date: "TCO 2028", budget: "$15.8M", probability: 97, milestones: [] },
  { id: "tx_sason", opportunity_id: "opp_sason", property: "Sason — Rivage PH-B", client: "Sason", deal_type: "Purchase", status: "Pre-construction", meta: "Pre-construction · Construction milestones · Delivery Q4 2026", milestones_label: "Finish selections due", pct: "72%", next_peek: "Deadline Jul 21", status_color: "#5D5D5D", gci: "$660K", close_date: "TCO Q4 26", budget: "$22M", probability: 97, milestones: [] },
  { id: "tx_klein", opportunity_id: "opp_klein", property: "Klein — Estates at Acqualina PH", client: "Klein", deal_type: "Listing", status: "Active Listing", meta: "Active Listing · $19.9M ask · Listed May 02 · 64 DOM", milestones_label: "3 visits · 14 days", pct: "40%", next_peek: "Weekly report due", status_color: "#5D5D5D", gci: "$498K", close_date: "Seller side", budget: "$19.9M", probability: 60, milestones: [] },
];

/* ---------- Threads + messages (Inbox, ~3262) ---------- */
const threadData = [
  { id: "marcelo", name: "Marcelo Carvalho", sub: "Rivage PH-A", channel: "whatsapp" as const, initials: "MC", unread: 2, time: "09:12",
    msgs: [
      { dir: "in" as const, text: "Bom dia! We really enjoyed the Rivage tour on Saturday.", time: "Sat 14:20" },
      { dir: "out" as const, text: "So glad — the PH-A layout suits your brief. Happy to walk through the finish timeline whenever works.", time: "Sat 15:02" },
      { dir: "in" as const, text: "My wife is a little concerned about the construction schedule. Could you send the developer’s latest?", time: "Sat 16:45" },
      { dir: "out" as const, text: "Of course — sending the developer’s finish schedule and brochure now.", time: "Sun 10:05" },
      { dir: "in" as const, text: "Perfect, thank you. Saturday 11am works for a second visit.", time: "09:12" },
    ] },
  { id: "nakamura", name: "Kenji Nakamura", sub: "Bal Harbour 1503", channel: "email" as const, initials: "KN", unread: 1, time: "Jul 05",
    msgs: [
      { dir: "out" as const, text: "Kenji, submitted the offer package this morning. I’ll flag the moment we hear back.", time: "Jul 01 09:30" },
      { dir: "in" as const, text: "Thank you. Reviewing with my advisor — will revert on the counter shortly.", time: "Jul 05 18:10" },
    ] },
  { id: "sterling", name: "Robert Sterling", sub: "Acqualina 4802", channel: "sms" as const, initials: "RS", unread: 0, time: "Jul 03",
    msgs: [
      { dir: "in" as const, text: "Financing is confirmed on my end.", time: "Jul 03 11:02" },
      { dir: "out" as const, text: "Excellent — scheduling the final tour. Does Friday afternoon suit you?", time: "Jul 03 11:20" },
    ] },
  { id: "ravel", name: "Elena Ravel", sub: "Faena 8C", channel: "whatsapp" as const, initials: "ER", unread: 0, time: "Jun 28",
    msgs: [
      { dir: "in" as const, text: "Loved the finishes on the second viewing.", time: "Jun 28 16:40" },
      { dir: "out" as const, text: "Wonderful. I’ll prepare a summary of terms so you can review at your pace.", time: "Jun 28 17:15" },
    ] },
  { id: "keller", name: "Anton Keller", sub: "Golden Beach", channel: "email" as const, initials: "AK", unread: 0, time: "Jun 26",
    msgs: [
      { dir: "out" as const, text: "Sent the comparative valuation on both compounds for your review.", time: "Jun 26 10:00" },
      { dir: "in" as const, text: "Received — let’s discuss the counter next week.", time: "Jun 26 14:30" },
    ] },
  { id: "alvarez", name: "Carlos Alvarez", sub: "Continuum 2904", channel: "whatsapp" as const, initials: "CA", unread: 0, time: "Jul 02",
    msgs: [
      { dir: "out" as const, text: "Appraisal is ordered — close remains on track for Jul 18.", time: "Jul 02 12:05" },
      { dir: "in" as const, text: "Great, appreciate the update.", time: "Jul 02 12:40" },
    ] },
  { id: "bittencourt", name: "Ana Bittencourt", sub: "Referral partner", channel: "whatsapp" as const, initials: "AB", unread: 0, time: "Jun 30",
    msgs: [
      { dir: "in" as const, text: "Happy to introduce a couple more clients this quarter.", time: "Jun 30 09:15" },
      { dir: "out" as const, text: "That means a great deal, Ana — thank you. Lunch on me soon.", time: "Jun 30 09:50" },
    ] },
];

export const threads: Thread[] = threadData.map((t) => ({
  id: t.id, contact_id: t.id, channel: t.channel, unread: t.unread > 0,
  unread_count: t.unread, subject: t.sub, initials: t.initials, last_time: t.time,
}));

export const messages: Message[] = threadData.flatMap((t) =>
  t.msgs.map((m, i) => ({ id: `${t.id}_m${i + 1}`, thread_id: t.id, dir: m.dir, body: m.text, at: m.time })),
);

/* ---------- Drafts (Touch Today queue, ~2265 — draft:true items) ---------- */
export const drafts: Draft[] = [
  { id: "q1", target: { kind: "contact", id: "marcelo" }, channel: "whatsapp", language: "PT", status: "pending", name_label: "Marcelo Carvalho", value_label: "$412K", subject: "Confirm 2nd visit · send developer construction schedule", plan: "Confirm 2nd visit + hand over developer schedule (attached)", body: "\"Marcelo, consegui o cronograma oficial da obra — 3 pontos que respondem a preocupação da Fernanda. Te ligo às 17h?\"" },
  { id: "q2", target: { kind: "contact", id: "keller" }, channel: "whatsapp", language: "EN", status: "pending", name_label: "Family Office · Zurich", value_label: "$288K", subject: "Counter pending since Thu — push principal call before Wed", plan: "Force the principal call before Wednesday — offer two windows", body: "\"Anton — the seller is entertaining a second party Thursday. Can we get the principal on for 15 minutes tomorrow 8-10h your time?\"" },
  { id: "q3", target: { kind: "contact", id: "sterling" }, channel: "whatsapp", language: "EN", status: "pending", name_label: "R. Sterling", value_label: "$196K", subject: "Financing approved — schedule decisive tour vs Estates", plan: "Lock the decisive tour this week — inspection window closes Jul 08", body: "\"Robert — both units available Thursday afternoon. One visit, side by side, and you decide. 2pm?\"" },
  { id: "q4", target: { kind: "contact", id: "ravel" }, channel: "whatsapp", language: "PT", status: "pending", name_label: "Coral Gables buyer", value_label: "$96K", subject: "3 unanswered touches — re-engage with new angle", plan: "One last angle (new inventory) — if silent, approve downgrade to agent-run", body: "\"Saiu uma unidade nova no perfil que você procurava — quer que eu segure antes de abrir ao mercado?\"" },
  { id: "q6", target: { kind: "contact", id: "bittencourt" }, channel: "whatsapp", language: "PT", status: "pending", name_label: "A. Bittencourt", value_label: "—", subject: "WON 94 days ago, no referral ask — draft prepared", plan: "Warm referral ask + retribute (Zurich FO attorney intro)", body: "\"Ana — te devo uma. Tenho uma introdução que vale seu tempo, e uma pergunta: quem mais da sua rede deveria estar olhando Miami agora?\"" },
];

/* ---------- Referrals (partner portal cards, ~3642) ---------- */
export const referrals: Referral[] = [
  { id: "rivage", partner_id: "bittencourt", client: "Rivage · PH-A · Marcelo C.", stage: "Offer strategy", fee_pct: 25, agreement_status: "Signed · on file", payout_status: "projected" },
  { id: "golden", partner_id: "katz", client: "Golden Beach Villa · Bianca F.", stage: "Prep & staging", fee_pct: 25, agreement_status: "Signed · on file", payout_status: "projected" },
  { id: "continuum", partner_id: "itau", client: "Continuum 2904 · Miguel A.", stage: "Closing", fee_pct: 25, agreement_status: "Signed · on file", payout_status: "payable" },
  { id: "setai", partner_id: "itau", client: "Setai 1201 · R. Almeida", stage: "Closed", fee_pct: 25, agreement_status: "Paid · Dec 12, 2025", payout_status: "paid" },
];

/* ---------- Activities (interaction log, ~3210) ---------- */
const gactRaw: Array<{ date: string; type: string; name: string; body: string; outcome: string; agent: boolean }> = [
  { date: "Jul 06", type: "Call", name: "Estates at Acqualina 5601", body: "Confirmed Saturday 11am tour with buyer.", outcome: "Advanced", agent: false },
  { date: "Jul 04", type: "Showing", name: "Marcelo C. · Rivage PH-A", body: "Toured with spouse. Strong response to layout; spouse raised construction timeline concern.", outcome: "Advanced", agent: true },
  { date: "Jul 03", type: "Call", name: "Robert Sterling · Acqualina 4802", body: "Financing confirmed; scheduling final tour.", outcome: "Advanced", agent: false },
  { date: "Jul 03", type: "Call", name: "Anton Keller · Golden Beach", body: "Reviewed counter terms; principal call next week.", outcome: "Neutral", agent: false },
  { date: "Jul 02", type: "WhatsApp", name: "Marcelo C. · Rivage PH-A", body: "Shared developer brochure and finish schedule.", outcome: "Neutral", agent: false },
  { date: "Jul 02", type: "Call", name: "Carlos Alvarez · Continuum 2904", body: "Confirmed appraisal ordered; close on track for Jul 18.", outcome: "Neutral", agent: false },
  { date: "Jul 01", type: "Email", name: "Kenji Nakamura · Bal Harbour 1503", body: "Submitted offer package; awaiting counter.", outcome: "Neutral", agent: false },
  { date: "Jun 30", type: "Note", name: "Ana Bittencourt", body: "Introduced Marcelo Carvalho; thanked and kept warm.", outcome: "Neutral", agent: false },
  { date: "Jun 28", type: "Showing", name: "Elena Ravel · Faena 8C", body: "Second viewing of Faena 8C; positive on finishes.", outcome: "Advanced", agent: false },
  { date: "Jun 28", type: "WhatsApp", name: "Faena Penthouse", body: "Prompted seller for a counter response.", outcome: "Neutral", agent: false },
  { date: "Jun 26", type: "Email", name: "Anton Keller · Golden Beach", body: "Sent comparative valuation on two compounds.", outcome: "Neutral", agent: false },
  { date: "Jun 21", type: "Note", name: "Robert Sterling", body: "Comparing Acqualina vs Estates unit; leaning Acqualina.", outcome: "Neutral", agent: false },
];

const ACT_TYPE: Record<string, Activity["type"]> = { Call: "call", WhatsApp: "whatsapp", Email: "email", Showing: "showing", Note: "note", Task: "task" };
const ACT_OUTCOME: Record<string, Activity["outcome"]> = { Advanced: "advanced", Neutral: "neutral", Cooled: "cooled" };

export const activities: Activity[] = gactRaw.map((a, i) => ({
  id: `act_${i + 1}`, type: ACT_TYPE[a.type] ?? "note", body: a.body,
  outcome: ACT_OUTCOME[a.outcome], date: a.date, label: a.name, by_agent: a.agent,
}));

/* ---------- Documents (empty — populated on Drive drop, Fase 1 mock) ---------- */
export const documents: DocumentRef[] = [];

/* ---------- Settings (§01 profile, §02 cadence, §03 autonomy, §16 team) ---------- */
export const settings: Settings[] = [
  {
    id: "settings",
    profile: {
      name: "Wictor Arraes", role: "Principal", brokerage: "ARRAES & CO",
      license: "FL SL3521487", phone: "+1 305 ··· ····", email: "wictor@arraes.com",
      draft_languages: "PT · EN · ES", signature: "W. Arraes · A/CO",
    },
    cadences: {
      hot: { label: "HOT", desc: "Active buyers/sellers in decision window", days: 3 },
      warm: { label: "WARM", desc: "Qualified, not yet in motion", days: 7 },
      active: { label: "ACTIVE", desc: "Clients in transaction — status pulse", days: 3 },
      past: { label: "PAST", desc: "Closed relationships — referral capital", days: 90 },
      network: { label: "NETWORK", desc: "Vendors and referral partners", days: 30 },
    },
    /* §03 — read at runtime, never hard-coded (default toggle state). */
    autonomy_rules: {
      capture: { label: "Capture & structure communication", desc: "WhatsApp, email and voice memos become logged activities on the right record", autonomous: true },
      hygiene: { label: "Data hygiene", desc: "Deduplicate, fix fields, reset clocks on inbound touches", autonomous: true },
      drafts: { label: "Prepare drafts", desc: "Messages, briefs and documents — always queued for approval", autonomous: true },
      send: { label: "Send routine messages", desc: "Confirmations and reminders go out without approval", autonomous: false },
      status: { label: "Change lead status", desc: "Upgrades/downgrades applied directly instead of proposed", autonomous: false },
      chase: { label: "Chase vendors", desc: "Follow up on overdue milestones with vendors autonomously", autonomous: true },
    },
    contact_types: ["client", "prospect", "sphere", "partner", "vendor"],
    team: [
      { role: "Principal", sees: ["Everything — full system", "Agent approvals & autonomy", "All financials & forecasts", "Off-market inventory", "KYC & sensitive fields"], held: ["—"] },
    ],
  } as unknown as Settings,
];

/* ---------- Vault (private, Principal-only — empty in Fase 1) ---------- */
export const vault: VaultEntry[] = [];

export const fixtures = {
  contacts, mandates, opportunities, transactions, activities,
  threads, messages, drafts, documents, referrals, settings, vault,
};
