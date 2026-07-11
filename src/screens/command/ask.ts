/* Command Center · conversational ask (askSubmit ~249, _decorateAsk ~233).
   The Phase-1 agent is mocked: canned, record-referencing answers copied
   literally from the prototype. Real routing arrives with the Claude API. */

export type ScreenKey = "intel" | "tc" | "contacts" | "pipeline" | "activities" | "next" | "reports" | "settings" | "deal" | "network";
export const SCREEN_ROUTE: Record<ScreenKey, string> = {
  intel: "/intelligence", tc: "/transactions", contacts: "/contacts", pipeline: "/opportunities",
  activities: "/activities", next: "/activities", reports: "/reports", settings: "/settings",
  deal: "/opportunities", network: "/intelligence",
};

export interface AskAction { label: string; screen?: ScreenKey; contact?: string }
export interface ChartBar { m: string; h: string; on?: boolean }
export interface AskRich {
  kind: "chart" | "list" | "deal" | "stats";
  bars?: ChartBar[]; rows?: Array<Record<string, string>>; total?: string;
  title?: string; sub?: string; stats?: Array<{ l: string; v: string }>; alert?: string;
}
export interface AskAnswer { q: string; a: string; actions: AskAction[]; rich?: AskRich; audit?: string }

const CONTACT_MAP: Array<[string, string, string]> = [
  ["marcelo", "marcelo", "Marcelo Carvalho"], ["keller", "keller", "Anton Keller"], ["zurich", "keller", "Anton Keller"],
  ["sterling", "sterling", "Robert Sterling"], ["bittencourt", "bittencourt", "Ana Bittencourt"],
  ["nakamura", "nakamura", "Kenji Nakamura"], ["ravel", "ravel", "Elena Ravel"], ["alvarez", "alvarez", "Carlos Alvarez"],
];
const NAV_MAP: Array<[string, ScreenKey, string]> = [
  ["opportunities", "pipeline", "Opportunities"], ["pipeline", "pipeline", "Opportunities"],
  ["contacts", "contacts", "Contacts"], ["network", "network", "Network"],
  ["activities", "activities", "Activities"], ["inbox", "activities", "Activities"],
  ["intel", "intel", "Intelligence"], ["report", "reports", "Reports"],
  ["settings", "settings", "Settings"], ["transaction", "tc", "Transaction"],
  ["today", "next", "Today"], ["tasks", "next", "Today"],
];

/** Pure — maps a query to the agent's canned answer (§ askSubmit). */
export function askSubmit(text: string): AskAnswer {
  const lo = text.toLowerCase();

  // 1 · log / create
  if (/^(log |loga|registra|new task|nova task|create|criar|note|anota|schedule|agenda|marca|update)/.test(lo)) {
    const hit = CONTACT_MAP.find(([k]) => lo.includes(k));
    const who = hit ? hit[2] : "General";
    const isMeeting = /(agenda|marca|schedule|meeting|visita|tour|call)/.test(lo);
    return {
      q: text, actions: [{ label: "Open Today", screen: "next" }],
      a: `${isMeeting ? "Scheduled" : "Logged"} for ${who}. The agent structured type, date and next action${isMeeting ? " + calendar event with D-1 confirmation" : ""}.`,
      audit: `Created via Ask · ${who} — “${text}” (agent-structured)`,
    };
  }

  // 2 · open contact / status
  const cHit = CONTACT_MAP.find(([k]) => lo.includes(k));
  if (cHit && /(open|show|status|how is|how's)/.test(lo)) {
    if (/(status|how is|how's)/.test(lo)) {
      if (cHit[2] === "Robert Sterling") {
        return { q: text, a: "In contract, on schedule — one point of attention:", actions: [{ label: "Open transaction", screen: "tc" }],
          rich: { kind: "deal", title: "Sterling — Acqualina 4802", sub: "Under Contract · Cash · Closing Aug 15", stats: [{ l: "GCI", v: "$530K" }, { l: "Milestones", v: "2 of 9" }, { l: "Inspection ends", v: "Jul 08" }], alert: "HOA approval package due Jul 11 — T-3 · draft to association ready" } };
      }
      if (cHit[2] === "Marcelo Carvalho") {
        return { q: text, a: "Strong momentum — cadence overdue by 1 day:", actions: [{ label: "Open deal", screen: "deal" }, { label: "Open contact", contact: "marcelo" }],
          rich: { kind: "deal", title: "Marcelo C. — Rivage PH-A", sub: "Tour Completed · 45% · Expected close Sep 2026", stats: [{ l: "Budget", v: "$18.5M" }, { l: "W.GCI", v: "$250K" }, { l: "Next action", v: "Jul 08" }], alert: "Cadence day 4 of 3 — confirm 2nd visit + send developer schedule" } };
      }
      return { q: text, a: `${cHit[2]}: record opened alongside — latest touches, deals and tasks in view.`, actions: [{ label: `Open ${cHit[2].split(" ")[0]}`, contact: cHit[1] }] };
    }
    return { q: text, a: `${cHit[2]} opened.`, actions: [{ label: `Open ${cHit[2].split(" ")[0]}`, contact: cHit[1] }] };
  }

  // 3 · navigate
  const nHit = NAV_MAP.find(([k]) => lo.includes(k));
  if (nHit && /(open|go|show|take me)/.test(lo)) return { q: text, a: `${nHit[2]} opened.`, actions: [{ label: `Open ${nHit[2]}`, screen: nHit[1] }] };

  // 4 · questions
  if (/(september|setembro)/.test(lo)) return { q: text, a: "September concentrates the quarter — $4.40M weighted across 4 closings:", actions: [{ label: "Open forecast", screen: "intel" }],
    rich: { kind: "chart", bars: [{ m: "JUL", h: "31%" }, { m: "AUG", h: "10%" }, { m: "SEP", h: "100%", on: true }, { m: "OCT", h: "2%" }, { m: "NOV", h: "14%" }, { m: "DEC", h: "5%" }], rows: [{ name: "Indian Creek Estate", value: "$3.02M" }, { name: "Zurich FO · Golden Beach", value: "$504K" }, { name: "Faena Penthouse", value: "$460K" }, { name: "Marcelo · Rivage PH-A", value: "$412K" }], total: "SEP · $4.40M weighted GCI" } };
  if (/(overdue|atrasad)/.test(lo)) return { q: text, a: "4 items overdue — click to open each:", actions: [{ label: "Open queue", screen: "contacts" }],
    rich: { kind: "list", rows: [
      { dot: "#D0342C", name: "Marcelo Carvalho", note: "HOT · cadence day 4 of 3 — 2nd visit + developer schedule", value: "$412K", contact: "marcelo" },
      { dot: "#D0342C", name: "Bal Harbour Listing", note: "19 days since last touch — threshold 14 · re-touch draft ready", value: "", screen: "intel" },
      { dot: "#D0342C", name: "Sterling · HOA package", note: "Due Jul 11 · T-3 — draft to association ready", value: "$530K", screen: "tc" },
      { dot: "#D0342C", name: "Ana Bittencourt", note: "Referral ask · 94 days since close — draft prepared", value: "", contact: "bittencourt" } ] } };
  if (/(closes|close|forecast|how much)/.test(lo)) return { q: text, a: "July: $1.34M weighted across 3 closings. The semester peak is September:", actions: [{ label: "Open forecast", screen: "intel" }],
    rich: { kind: "chart", bars: [{ m: "JUL", h: "31%", on: true }, { m: "AUG", h: "10%" }, { m: "SEP", h: "100%" }, { m: "OCT", h: "2%" }, { m: "NOV", h: "14%" }, { m: "DEC", h: "5%" }], rows: [{ name: "Faena 8C · Ravel", value: "$530K" }, { name: "Continuum 2904 · Alvarez", value: "$410K" }, { name: "Bal Harbour 1503 · Nakamura", value: "$400K" }], total: "JUL · $1.34M weighted GCI" } };
  if (/(health|pipeline)/.test(lo)) return { q: text, a: "Pipeline health 82/100 — aging is the only factor on watch (2 stalled deals):", actions: [{ label: "Open Intelligence", screen: "intel" }],
    rich: { kind: "stats", rows: [{ label: "Coverage", value: "3.2×", w: "88%" }, { label: "Velocity", value: "Good", w: "74%" }, { label: "Aging", value: "Watch", w: "58%" }, { label: "Hygiene", value: "Clean", w: "96%" }] } };

  // default
  return { q: text, a: "Understood. Routed to the agent; interpretation and proposal will appear in Needs Your Decision.", actions: [] };
}

export const ASK_CHIPS = ["Approve the day", "Touch queue", "What closes this month?", "Who is overdue?"];

export const HOME_REMINDERS: Array<{ dot: string; text: string; action: string; to: string }> = [
  { dot: "#D0342C", text: "Marcelo Carvalho · touch overdue — day 4 of 3, draft ready", action: "Open queue", to: "/contacts?view=queue" },
  { dot: "#D0342C", text: "Sterling · HOA package due Jul 11 — inside T-3 window", action: "Open transaction", to: "/transactions" },
  { dot: "#0D0D0D", text: "3 decisions waiting — Rivage split is time-sensitive", action: "Decide", to: "/intelligence" },
];
