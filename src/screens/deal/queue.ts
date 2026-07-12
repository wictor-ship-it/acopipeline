/* Deal Now-queue variants (fragment 03 ~204-340) — MLS Match · Tour · Redline ·
   Drafts. Literal seed from logic-and-data.js: the Rivage · PH-A showcase deal
   (mls ~636, dlTourStops ~4368, redRows ~4434). Keyed by the deal name; deals
   without an entry fall back to the single draft card + all-clear. */

export interface MlsRow { addr: string; price: string; match: string }
export interface TourStop { t: string; addr: string; note: string }
export interface RedRow { clause: string; yours: string; counter: string; tag: "CHANGED" | "NEW" }
export interface DraftItem { kind: string; text: string }

export interface DealQueue {
  lang: string;
  mls?: { summary: string; langNote: string; rows: MlsRow[] };
  tour?: { title: string; summary: string; stops: TourStop[]; note: string };
  redline?: { meta: string; rows: RedRow[] };
  drafts?: DraftItem[];
  doneLine: string;
  nextMilestone: string;
}

const RIVAGE: DealQueue = {
  lang: "PT",
  mls: {
    summary: "2 new MLS matches for this search · top fit 95%",
    langNote: "agent drafts in PT — identified from the profile",
    rows: [
      { addr: "Rivage PH-B — same floorplate, east", price: "$19.4M", match: "95%" },
      { addr: "Estates at Acqualina 5601 — finalist set", price: "$16.0M", match: "91%" },
      { addr: "St Regis SI Tower 2 — pre-construction PH", price: "$29.0M", match: "83%" },
    ],
  },
  tour: {
    title: "Tour planning",
    summary: "draft itinerary — 3 stops proposed · agent coordinates",
    stops: [
      { t: "Sat 11:00", addr: "Rivage · PH-A", note: "the primary — client walkthrough" },
      { t: "Sat 12:30", addr: "Rivage PH-B — same floorplate, east", note: "comparison stop · 95% fit" },
      { t: "Sat 14:00", addr: "Estates at Acqualina 5601 — finalist set", note: "backup — only if time allows" },
    ],
    note: "agent coordinates access and confirms with the listing side",
  },
  redline: {
    meta: "Counter received · diffed against your draft in 40s",
    rows: [
      { clause: "Purchase price", yours: "$18.5M", counter: "raised · counter at +1.7%", tag: "CHANGED" },
      { clause: "Escrow deposit", yours: "10% · deal norm", counter: "15% requested at signing", tag: "CHANGED" },
      { clause: "Inspection period", yours: "15 days · AS-IS", counter: "10 days proposed", tag: "CHANGED" },
      { clause: "Closing date", yours: "Jul 20 target", counter: "pushed 14 days", tag: "CHANGED" },
      { clause: "Rider B · arbitration", yours: "not present", counter: "added by counterparty", tag: "NEW" },
    ],
  },
  drafts: [
    { kind: "WhatsApp · PT", text: "Marcelo, confirmo a segunda visita ao Rivage para sábado às 11h com a Beatriz. Levo o cronograma de obra atualizado." },
  ],
  doneLine: "All actions cleared today",
  nextMilestone: "Send construction schedule · Jul 08",
};

const DEAL_QUEUE: Record<string, DealQueue> = {
  "Rivage PH-A · Marcelo C.": RIVAGE,
};

export function getDealQueue(name: string | undefined): DealQueue | undefined {
  if (!name) return undefined;
  return DEAL_QUEUE[name] ?? (name.startsWith("Rivage") ? RIVAGE : undefined);
}
