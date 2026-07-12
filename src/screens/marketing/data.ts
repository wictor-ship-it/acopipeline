/* Marketing reference data — copied literally from logic-and-data.js
   (colors ~3372, campaigns ~3433, sequence ~3440, segments ~3447, trends
   ~3454, kanban ~3462, matrix ~3469, calendar posts ~3378). */

export const MKT = { G: "#10A37F", A: "#B45309", GR: "#8F8F8F", IG: "#C13584", LI: "#0A66C2" };

export const CAMP_KPIS: Array<{ label: string; value: string; delta: string; deltaColor: string }> = [
  { label: "Conversations started · 7d", value: "14", delta: "+6 vs prior week", deltaColor: "#10A37F" },
  { label: "Tours from campaigns", value: "3", delta: "2 corridor · 1 seller", deltaColor: "#5D5D5D" },
  { label: "Pipeline influenced", value: "$2.1M", delta: "weighted GCI", deltaColor: "#5D5D5D" },
  { label: "Awaiting approval", value: "2", delta: "campaigns", deltaColor: "#5D5D5D", },
];

export interface Campaign { name: string; type: string; aud: string; ch: string; dot: string; stColor: string; status: string; prog: string; step: string }
export const CAMPAIGNS: Campaign[] = [
  { name: "Rivage PH-A — Off-market preview", type: "Listing launch", aud: "HOT · Corridor (12)", ch: "WA → IG → LI → Email", dot: MKT.A, stColor: "#B45309", status: "Awaiting approval", prog: "0%", step: "0/5" },
  { name: "Market Report — July", type: "Monthly report", aud: "All active (64)", ch: "Email → WA → LI", dot: MKT.G, stColor: "#10A37F", status: "Executing", prog: "60%", step: "3/5" },
  { name: "Nurture — Family offices", type: "Nurture", aud: "Trophy interest (6)", ch: "Email → LI", dot: MKT.G, stColor: "#10A37F", status: "Executing", prog: "40%", step: "2/5" },
  { name: "Broker Open — Estates PH · Jul 15", type: "Event", aud: "Corridor brokers (38)", ch: "Email → WA", dot: MKT.A, stColor: "#B45309", status: "Awaiting approval", prog: "20%", step: "1/5" },
  { name: "Series “What $2,780/SF buys”", type: "Personal brand", aud: "IG + LI public", ch: "IG → LI", dot: MKT.G, stColor: "#10A37F", status: "Executing", prog: "50%", step: "ep 2/4" },
];

export interface SeqStep { day: string; chan: string; what: string; dot: string; st: string; stColor: string }
export const SEQ: SeqStep[] = [
  { day: "D0", chan: "WhatsApp", what: "1:1 personalized — 12 HOT in the corridor", dot: MKT.A, st: "12 drafts ready", stColor: "#B45309" },
  { day: "D1", chan: "Instagram", what: "Story teaser — the double-height ceiling detail", dot: "#C7C7C7", st: "brief ready · needs photo", stColor: "#8F8F8F" },
  { day: "D3", chan: "LinkedIn", what: "EN post — corridor PH scarcity", dot: "#C7C7C7", st: "agent draft", stColor: "#8F8F8F" },
  { day: "D5", chan: "Email", what: "Dossier PDF — localized per contact", dot: "#C7C7C7", st: "template ready", stColor: "#8F8F8F" },
  { day: "D7", chan: "WhatsApp", what: "Follow-up — only opened, no reply", dot: "#C7C7C7", st: "conditional", stColor: "#8F8F8F" },
];

export const ONE_TO_ONE: Array<{ name: string; meta: string; body: string }> = [
  { name: "Marcelo Carvalho", meta: "PT · native · HOT", body: '"Marcelo, antes de abrir ao mercado: o PH-A do Rivage saiu a $2,610/SF — abaixo dos comps que você viu sábado. Te mando o dossier?"' },
  { name: "W. Chen", meta: "EN · native · HOT", body: '"Wei — off-market PH at Rivage, flow-through layout like the 53 line you liked. 48h before it lists. Worth a look Thursday?"' },
  { name: "R. Weiss", meta: "EN · native · WARM", body: '"Rachel, remember you asked about Rivage resale supply — one PH surfaces this week, pre-market. Sending the numbers."' },
];

export const SEGMENTS: Array<{ name: string; def: string; n: string; langs: string; last: string }> = [
  { name: "HOT · Acqualina corridor", def: "stage HOT + interest Acqualina/Rivage", n: "12", langs: "8 PT · 3 EN · 1 ES", last: "Off-market preview · today" },
  { name: "Family offices · trophy", def: "entities + $15M+ budget + flow-through", n: "6", langs: "6 EN", last: "Nurture EN · running" },
  { name: "BR buyers · FX window", def: "BR nationality + strong BRL + nurture", n: "9", langs: "9 PT", last: "June report · 4 opens" },
  { name: "Active sellers", def: "live listings + bi-weekly reporting", n: "4", langs: "2 PT · 2 EN", last: "Visit report · Jul 01" },
  { name: "Nurture 90d+ untouched", def: "no reply in 90d · re-engagement", n: "28", langs: "14 PT · 11 EN · 3 ES", last: "— proposed: trends series" },
];

export const MATRIX: Array<{ int: string; hot: string; warm: string; nur: string; langs: string }> = [
  { int: "Acqualina–Rivage corridor", hot: "9", warm: "6", nur: "11", langs: "PT · EN" },
  { int: "Trophy / flow-through $15M+", hot: "3", warm: "4", nur: "6", langs: "EN" },
  { int: "Pre-construction 2028", hot: "2", warm: "5", nur: "8", langs: "EN · ES" },
  { int: "Sellers · corridor", hot: "2", warm: "2", nur: "3", langs: "PT · EN" },
];

export const TRENDS: Array<{ src: string; title: string; rel: string; why: string }> = [
  { src: "Market", title: "Corridor PH inventory down 18% QoQ", rel: "92%", why: "relevance 92 · touches 9 HOT · suggests WA 1:1 + data reel" },
  { src: "Macro", title: "Fed signals September cut", rel: "88%", why: "relevance 88 · urgency for cash buyers to lock price · 14 contacts" },
  { src: "Social", title: "“Calm-voice walkthrough” format +34% saves", rel: "84%", why: "relevance 84 · apply to PH Rivage · Reel 24–34s · Tue/Thu 7 PM" },
  { src: "Macro", title: "BRL at 4.9 — window for Brazilian buyers", rel: "79%", why: "relevance 79 · BR segment (9) · PT broadcast + PT IG post" },
  { src: "Market", title: "3 new projects announced in Sunny Isles", rel: "71%", why: "relevance 71 · comparison content — 2028 delivery vs ready now · LI carousel" },
];

export const KANBAN: Array<{ col: string; n: string; cards: Array<{ chan: string; title: string; dot: string }> }> = [
  { col: "Brief", n: "2", cards: [{ chan: "IG Reel", title: "BRL 4.9 — BR window", dot: MKT.IG }, { chan: "LI", title: "Cost of waiting", dot: MKT.LI }] },
  { col: "Draft", n: "3", cards: [{ chan: "WA 1:1", title: "Off-market Rivage — 12 HOT", dot: MKT.G }, { chan: "Email", title: "July report PDF", dot: MKT.GR }] },
  { col: "Approval", n: "2", cards: [{ chan: "IG Reel", title: "Calm-voice walkthrough", dot: MKT.IG }, { chan: "WA", title: "Broker open reminder", dot: MKT.G }] },
  { col: "Scheduled", n: "4", cards: [{ chan: "IG Story", title: "Poll Thu 7 PM", dot: MKT.IG }, { chan: "LI", title: "Scarcity carousel Mon", dot: MKT.LI }] },
  { col: "Live", n: "3", cards: [{ chan: "Email", title: "Nurture ep 2 — 67% open", dot: MKT.GR }, { chan: "IG", title: "$/SF series ep 2 — 214 saves", dot: MKT.IG }] },
];

const CH_DOT: Record<string, string> = { WA: MKT.G, IG: MKT.IG, LI: MKT.LI, Email: MKT.GR };
const CAL_POSTS: Record<string, Array<{ chan: string; lang: string; title: string; st: string }>> = {
  "Sun 06": [{ chan: "LI", lang: "EN", title: "PH scarcity — data carousel", st: "●" }],
  "Mon 07": [{ chan: "IG", lang: "PT", title: "Rivage walkthrough reel · 7 PM", st: "◐" }],
  "Tue 08": [{ chan: "WA", lang: "auto", title: "Report broadcast — corridor", st: "●" }, { chan: "Email", lang: "auto", title: "Dossier — localized", st: "●" }],
  "Wed 09": [{ chan: "IG", lang: "EN", title: "Story — comparison poll · 7 PM", st: "◐" }],
  "Thu 10": [{ chan: "Email", lang: "EN", title: "Family-office nurture ep 3", st: "●" }],
  "Fri 11": [{ chan: "IG", lang: "PT", title: "Client visit — behind the scenes", st: "○" }],
  "Sat 12": [{ chan: "IG", lang: "PT", title: "$2,780/SF series · ep 3", st: "◐" }],
};
export const CAL_WEEK = ["Sun 06", "Mon 07", "Tue 08", "Wed 09", "Thu 10", "Fri 11", "Sat 12"].map((label) => {
  const [day, n] = label.split(" ");
  return { day, n, hl: label === "Fri 11", posts: (CAL_POSTS[label] ?? []).map((p) => ({ ...p, dot: CH_DOT[p.chan === "IG" ? "IG" : p.chan] ?? MKT.GR })) };
});
