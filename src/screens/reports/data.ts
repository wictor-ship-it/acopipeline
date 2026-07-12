/* Reports reference data — copied literally from
   design-reference/logic-and-data.js (reportKpis ~2024, funnel/divisionGci/
   sources/velocity/priceBands/geography/lossReasons/assetMix ~2035-2143,
   income ~4576, marketing ~4553). */

export const REP_NAV: Array<[string, string]> = [
  ["01", "Overview"], ["02", "Pipeline & Forecast"], ["04", "Sources & Market"],
  ["05", "Activity"], ["08", "Marketing"], ["07", "Income"], ["06", "Custom Report"],
];

export const REPORT_KPIS: Array<{ label: string; value: string }> = [
  { label: "Pipeline Value", value: "$397M" }, { label: "Weighted Value", value: "$176.7M" },
  { label: "Potential GCI", value: "$12.0M" }, { label: "Weighted GCI", value: "$5.3M" },
  { label: "HOT Leads", value: "34" }, { label: "Closings · 30d", value: "3" },
  { label: "Overdue Follow-ups", value: "0" }, { label: "Average Ticket", value: "$6.7M" },
];

export const FUNNEL: Array<{ stage: string; count: string; width: string }> = [
  { stage: "HOT", count: "34", width: "57%" }, { stage: "WARM", count: "16", width: "27%" },
  { stage: "NURTURING", count: "60", width: "100%" }, { stage: "ON HOLD", count: "0", width: "1%" },
  { stage: "WON", count: "0", width: "1%" }, { stage: "LOST", count: "9", width: "15%" },
];

export const DIVISION_GCI: Array<{ label: string; value: string; width: string }> = [
  { label: "Qualified", value: "110", width: "100%" }, { label: "Negotiation", value: "0", width: "1%" },
  { label: "Under Contract", value: "0", width: "1%" }, { label: "Lost", value: "9", width: "8%" },
];

export const LOSS_REASONS: Array<{ reason: string; count: string; width: string }> = [
  { reason: "Price / valuation gap", count: "9", width: "100%" }, { reason: "Timeline / delivery", count: "6", width: "67%" },
  { reason: "Chose competitor", count: "5", width: "56%" }, { reason: "Financing", count: "3", width: "33%" },
];

export const ASSET_MIX: Array<{ label: string; pct: string; shade: string }> = [
  { label: "Condo", pct: "52%", shade: "#0D0D0D" }, { label: "Estate", pct: "24%", shade: "#303030" },
  { label: "Waterfront lot", pct: "14%", shade: "#5D5D5D" }, { label: "Commercial", pct: "10%", shade: "#8F8F8F" },
];

export const SOURCES: Array<{ name: string; gci: string }> = [
  { name: "Condo", gci: "$274.5M" }, { name: "Commercial", gci: "$50.0M" }, { name: "Listing", gci: "$49.1M" },
  { name: "Development", gci: "$14.0M" }, { name: "Industrial", gci: "$8.5M" }, { name: "Investment Acquisition", gci: "$5.0M" },
];

export const VELOCITY: Array<{ stage: string; days: string; width: string }> = [
  { stage: "Lead → Qualified", days: "6d", width: "14%" }, { stage: "Qualified → Tour", days: "9d", width: "21%" },
  { stage: "Tour → Offer", days: "14d", width: "33%" }, { stage: "Offer → Negotiation", days: "11d", width: "26%" },
  { stage: "Negotiation → Contract", days: "18d", width: "43%" }, { stage: "Contract → Close", days: "42d", width: "100%" },
];

export const PRICE_BANDS: Array<{ band: string; count: string; h: string }> = [
  { band: "$4–10M", count: "18", h: "100%" }, { band: "$10–20M", count: "14", h: "78%" },
  { band: "$20–35M", count: "9", h: "50%" }, { band: "$35M +", count: "5", h: "28%" },
];

export const GEOGRAPHY: Array<{ area: string; value: string; width: string }> = [
  { area: "Sunny Isles", value: "$118M", width: "100%" }, { area: "Bal Harbour", value: "$96M", width: "82%" },
  { area: "Golden Beach", value: "$80M", width: "68%" }, { area: "Fisher Island", value: "$64M", width: "54%" },
  { area: "Brickell", value: "$44M", width: "40%" },
];

export const FORECAST: Array<{ m: string; value: string }> = [
  { m: "July", value: "$152K" }, { m: "August", value: "$42K" }, { m: "September", value: "$4.40M" },
  { m: "October", value: "$0" }, { m: "November", value: "$599K" }, { m: "December", value: "$0" },
];

/* Activity & Outreach · productivity by period */
export const ACTV_DATA: Record<string, { total: string; note: string; metrics: Array<[string, string, number]> }> = {
  week: { total: "142 touches this week", note: "vs 128 prior week", metrics: [["Messages", "48", 12], ["Calls", "19", 19], ["Emails", "27", -13], ["Showings", "6", 50], ["Follow-ups", "31", 29], ["Notes", "11", 10]] },
  month: { total: "566 touches this month", note: "vs 502 prior month", metrics: [["Messages", "193", 9], ["Calls", "74", 4], ["Emails", "108", -6], ["Showings", "22", 29], ["Follow-ups", "128", 12], ["Notes", "41", 8]] },
  quarter: { total: "1,704 touches this quarter", note: "vs 1,488 prior quarter", metrics: [["Messages", "587", 14], ["Calls", "221", 8], ["Emails", "341", 2], ["Showings", "68", 19], ["Follow-ups", "372", 16], ["Notes", "115", 6]] },
};

/* Income & Receivables (~4576) */
export const INC_KPIS: Array<{ label: string; value: string; sub: string }> = [
  { label: "Net income · YTD", value: "$975K", sub: "collected 2026 · 5 events" },
  { label: "Payable · next 30 days", value: "$542K", sub: "3 events — Continuum · Sterling · St Regis D1" },
  { label: "Projected · in motion", value: "$2.03M", sub: "net of splits & referrals · 6 files" },
  { label: "Referral fees out", value: "$335K", sub: "committed · $54K releases next 30 days" },
];
export const INC_RECV: Array<{ deal: string; when: string; gci: string; ref: string; net: string; st: string; c: string }> = [
  { deal: "Continuum 2904 — Alvarez", when: "Jul 18, 2026", gci: "$216K", ref: "−$54.0K", net: "$129.6K", st: "Payable · closing", c: "#0D0D0D" },
  { deal: "Sterling — Acqualina 4802", when: "Aug 2026", gci: "$342K", ref: "—", net: "$273.6K", st: "In escrow", c: "#0D0D0D" },
  { deal: "St Regis T2 PH — Deposit 1 · 20%", when: "Jul 24, 2026", gci: "$174K", ref: "—", net: "$139.2K", st: "Armed · pro-rata §6.5", c: "#0D0D0D" },
  { deal: "Rivage · PH-A", when: "Sep 2026", gci: "$555K", ref: "−$138.8K", net: "$333.0K", st: "Projected", c: "#B45309" },
  { deal: "Golden Beach Villa", when: "Q4 2026", gci: "$570K", ref: "−$142.5K", net: "$342.0K", st: "Projected", c: "#B45309" },
  { deal: "Faena Penthouse", when: "Oct 2026", gci: "$1.02M", ref: "—", net: "$816.0K", st: "Projected", c: "#B45309" },
];
export const INC_TOTAL_LINE = "6 open receivables · $2.88M gross · $2.03M net · $335K referral committed";
export const INC_PAID: Array<{ deal: string; when: string; gci: string; net: string }> = [
  { deal: "Bal Harbour 1801 — lease", when: "Jul 08, 2026", gci: "$21K", net: "$16.8K" },
  { deal: "Portofino 2302 — Zanotti", when: "Jun 30, 2026", gci: "$126K", net: "$100.8K" },
  { deal: "Continuum South 1802", when: "May 12, 2026", gci: "$187K", net: "$149.6K" },
  { deal: "Aventura PH — resale", when: "Mar 21, 2026", gci: "$255K", net: "$204.0K" },
  { deal: "Setai 1201 — referral-sourced", when: "Dec 12, 2025", gci: "$192K", net: "$115.2K" },
];
const INC_HIST_RAW: Array<[string, number]> = [["Feb", 118], ["Mar", 204], ["Apr", 96], ["May", 310], ["Jun", 101], ["Jul", 146]];
export const INC_HIST = INC_HIST_RAW.map(([m, v]) => ({ m, amt: `$${v}K`, w: `${Math.round((v / 310) * 100)}%` }));

/* Marketing (~4553) */
export const MKT_KPIS: Array<{ label: string; value: string; sub: string }> = [
  { label: "Conversations started", value: "47", sub: "this quarter · WhatsApp-led" },
  { label: "Tours from campaigns", value: "12", sub: "4 became active deals" },
  { label: "Pipeline influenced", value: "$34.2M", sub: "6 deals touched by marketing" },
  { label: "GCI attributed", value: "$410K", sub: "weighted to closings" },
];
export const MKT_CHANNELS: Array<{ ch: string; metric: string; w: string; lead: string }> = [
  { ch: "WhatsApp · broadcast + 1:1", metric: "1,240 sent · 18% reply", w: "72%", lead: "34 conversations" },
  { ch: "Instagram", metric: "42.5K reach 30d · 1.2K saves", w: "100%", lead: "9 DMs → leads" },
  { ch: "LinkedIn", metric: "18.3K impressions", w: "44%", lead: "6 inbound" },
  { ch: "Email", metric: "41% open · 22% click", w: "30%", lead: "3 tours booked" },
];
export const MKT_ATTR: Array<{ campaign: string; chan: string; influenced: string; gci: string }> = [
  { campaign: "Rivage — off-market preview", chan: "IG + WhatsApp", influenced: "$18.5M", gci: "$138.8K" },
  { campaign: "June market report", chan: "WhatsApp broadcast", influenced: "$12.1M", gci: "$180K" },
  { campaign: "Bal Harbour corridor nurture", chan: "Email + IG", influenced: "$3.6M", gci: "$54K" },
];
