import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useCollection } from "../../data/hooks";
import { getAuditLog, onDataChange, save } from "../../data/repository";
import type { AuditEntry, Contact, Settings as SettingsRec } from "../../domain/types";
import { useAppState } from "../../app/state";
import { fetchGmailThreads } from "../../data/adapters/gmail";
import { fetchCalendarEvents } from "../../data/adapters/calendar";
import { getAgentStatus, type AgentStatus } from "../../data/adapters/agent";
import { SANS } from "../contacts/data";
import { CANON_STATUS, STATUS_PLAY } from "../contact/data";
import "./Settings.css";

/* ================= SCREEN · SETTINGS (fragment 16) =================
   Nav rail + sections. §03 Agent Autonomy and §02 Cadence are editable and
   persist to the settings store — the same store the AgentService and
   Intelligence read at runtime. */

const NAV: Array<[string, string]> = [
  ["01", "Profile"], ["16", "Team & Access"], ["03", "Agent Autonomy"], ["02", "Cadence Rules"],
  ["18", "Contact Types"], ["04", "Economics"], ["17", "Referral Partners"], ["05", "Integrations"],
  ["11", "Pipeline & Stages"], ["12", "MLS & Matching"], ["08", "Voice & Templates"], ["07", "Scoring & Forecast"],
  ["13", "Display & Locale"], ["09", "Data & Privacy"],
];

const AUTONOMY_ORDER = ["capture", "hygiene", "drafts", "send", "status", "chase"];
const CADENCE_ORDER = ["hot", "warm", "active", "past", "network"];
const CADENCE_DOT: Record<string, string> = { hot: "#0D0D0D", warm: "#5D5D5D", active: "#0D0D0D", past: "#8F8F8F", network: "#8F8F8F" };

const ECON = [
  { label: "Standard commission", value: "5.0%" }, { label: "Co-broke default split", value: "50 / 50" },
  { label: "Referral fee out", value: "25%" }, { label: "Probability bands", value: "HOT 60 · WARM 30 · NEW 10" },
];
const CONNECTORS = [
  { name: "Google Workspace", kind: "One OAuth · wictor@arraes.com", on: true },
  { name: "WhatsApp Business", kind: "Cloud API · +1 305 ··· · Meta verified", on: true },
  { name: "MLS", kind: "Matrix + broker feeds · nightly sync", on: true },
  { name: "DocuSign", kind: "Not connected — contracts stay manual", on: false },
];

/* Field descriptors — literal from logic-and-data.js (setScoring/Voice/Mls/Display/Stages). */
type Field = { id: string; label: string; value: string; opts?: string[] };

const SET_SCORING: Array<{ label: string; value: string; note: string }> = [
  { label: "Health Score weights", value: "Coverage 30 · Velocity 25 · Aging 25 · Hygiene 20", note: 'How the 82/100 is composed — tune what "healthy" means for your book' },
  { label: "Momentum factors", value: "Engagement 40 · Recency 35 · Velocity 25", note: "Per-deal momentum used in probability-arbitrage suggestions" },
  { label: "Stale thresholds", value: "HOT 14d · WARM 30d · Listing 21d", note: "Days without touch before a record surfaces in Risk Radar" },
  { label: "Forecast weighting", value: "Probability × GCI · month of expected close", note: "What the GCI Forecast bars are built from" },
  { label: "Queue ranking", value: "Urgency × Weighted GCI", note: "Order of Touch Today — value-weighted, not just chronological" },
];
const SET_VOICE: Field[] = [
  { id: "v1", label: "Draft tone", value: "Sober · direct", opts: ["Sober · direct", "Warm · personal", "Formal · institutional"] },
  { id: "v2", label: "Aphorism line", value: "On · rotates weekly", opts: ["On · rotates weekly", "On · fixed", "Off"] },
  { id: "v3", label: "Templates", value: "14 active · manage library" },
  { id: "v4", label: "Per-contact language", value: "Auto-detect from thread", opts: ["Auto-detect from thread", "Always PT", "Always EN", "Ask per contact"] },
  { id: "v5", label: "Signature block", value: "Short (WhatsApp) · Full (email)", opts: ["Short (WhatsApp) · Full (email)", "Always short", "Always full"] },
  { id: "v6", label: "Forbidden words", value: '"stunning" · "dream" · "exclusive" · "!"' },
];
const SET_MLS: Field[] = [
  { id: "m0", label: "Match source", value: "IDX · arraescollection.com", opts: ["IDX · arraescollection.com", "MIAMI MLS · RESO API (when live)", "Manual entry only"] },
  { id: "m1", label: "Sweep frequency", value: "Nightly", opts: ["Nightly", "Twice daily", "Weekly", "Manual only"] },
  { id: "m2", label: "Match threshold", value: "≥ 80% fit", opts: ["≥ 70% fit", "≥ 80% fit", "≥ 90% fit"] },
  { id: "m3", label: "Price tolerance", value: "+10% above budget", opts: ["+5% above budget", "+10% above budget", "+15% above budget", "Strict"] },
  { id: "m4", label: "Off-market sources", value: "Network · expired · FSBO" },
  { id: "m5", label: "Auto-suggest to client", value: "Off — always via approval", opts: ["Off — always via approval", "On — curated matches only"] },
  { id: "m6", label: "Comp radius", value: "Same building · 0.5 mi fallback", opts: ["Same building · 0.5 mi fallback", "0.5 mi", "1 mi", "Neighborhood"] },
];
const SET_DISPLAY: Field[] = [
  { id: "d1", label: "Landing screen", value: "Command Center", opts: ["Command Center", "Contacts · Queue", "Pipeline", "Activities"] },
  { id: "d2", label: "Currency · units", value: "USD · sq ft", opts: ["USD · sq ft", "USD · m²", "BRL · m²"] },
  { id: "d3", label: "Timezone", value: "America/New_York (EST)", opts: ["America/New_York (EST)", "America/Sao_Paulo (BRT)", "Europe/Zurich (CET)"] },
  { id: "d4", label: "Number format", value: "$18.5M · compact", opts: ["$18.5M · compact", "$18,500,000 · full"] },
  { id: "d5", label: "Density", value: "Comfortable", opts: ["Comfortable", "Compact"] },
  { id: "d6", label: "Week starts", value: "Monday", opts: ["Monday", "Sunday"] },
];
const SET_STAGE_FIELDS: Field[] = [
  { id: "s1", label: "Stage probabilities", value: "Prospecting 10 · Warm 30 · Hot 60 · UC 90" },
  { id: "s2", label: "Auto-advance rules", value: "Documented events only", opts: ["Documented events only", "Agent may move · logged", "Manual only"] },
  { id: "s3", label: "Lost reasons", value: "Price · Timing · Inventory · Cooled · Other broker" },
  { id: "s4", label: "Milestone templates", value: "Cash 9 · Financed 12 · Pre-construction 6" },
];

type Stage = { n: string; p: number };
type Pipes = { order: string[]; data: Record<string, Stage[]> };
const DEFAULT_PIPES: Pipes = {
  order: ["Purchases", "Listings", "Rentals", "Investments"],
  data: {
    Purchases: [{ n: "Prospecting", p: 10 }, { n: "Warm", p: 30 }, { n: "Hot", p: 60 }, { n: "Under Contract", p: 90 }, { n: "Won", p: 100 }, { n: "Lost", p: 0 }],
    Listings: [{ n: "Prospecting", p: 10 }, { n: "Contract", p: 40 }, { n: "Staging", p: 60 }, { n: "Marketing", p: 70 }, { n: "Won", p: 100 }, { n: "Lost", p: 0 }],
    Rentals: [{ n: "Prospecting", p: 10 }, { n: "Showings", p: 40 }, { n: "Contract", p: 80 }, { n: "Won", p: 100 }, { n: "Lost", p: 0 }],
    Investments: [{ n: "Prospecting", p: 10 }, { n: "Mandate", p: 30 }, { n: "Presented", p: 45 }, { n: "Underwriting", p: 65 }, { n: "Committed", p: 85 }, { n: "Won", p: 100 }],
  },
};
const PIPES_KEY = "aco-settings-pipes";
function loadPipes(): Pipes {
  try {
    const raw = localStorage.getItem(PIPES_KEY);
    if (raw) { const p = JSON.parse(raw) as Pipes; if (p?.order?.length) return p; }
  } catch { /* fall through to defaults */ }
  return DEFAULT_PIPES;
}

const GLASS: Array<{ name: string; base: string; b1: string; b2: string }> = [
  { name: "Sand & Ocean", base: "linear-gradient(135deg,#EFE7D8 0%,#DEE8E4 45%,#D8E0EC 100%)", b1: "rgba(219,190,138,0.55)", b2: "rgba(139,184,175,0.55)" },
  { name: "Miami Dusk", base: "linear-gradient(135deg,#F2E3DC 0%,#E6DEEC 45%,#D8DFF0 100%)", b1: "rgba(224,168,140,0.50)", b2: "rgba(178,166,214,0.50)" },
  { name: "Emerald Coast", base: "linear-gradient(135deg,#E3EDE7 0%,#DCE9E9 50%,#D9E4EE 100%)", b1: "rgba(126,188,162,0.50)", b2: "rgba(120,180,190,0.45)" },
  { name: "Champagne", base: "linear-gradient(135deg,#F5EBDD 0%,#F1E7DB 50%,#EDE4D8 100%)", b1: "rgba(226,196,148,0.50)", b2: "rgba(236,216,180,0.48)" },
  { name: "Rosé", base: "linear-gradient(135deg,#F6E8E4 0%,#F2E4E8 50%,#EEE2EE 100%)", b1: "rgba(230,168,158,0.45)", b2: "rgba(216,170,196,0.40)" },
  { name: "Sky", base: "linear-gradient(135deg,#E8F0F6 0%,#E4ECF4 50%,#DFE8F2 100%)", b1: "rgba(150,190,226,0.45)", b2: "rgba(170,206,232,0.42)" },
  { name: "Lavender", base: "linear-gradient(135deg,#EFEAF6 0%,#EAE6F2 50%,#E6E4F0 100%)", b1: "rgba(186,168,216,0.45)", b2: "rgba(202,186,226,0.40)" },
  { name: "Ivory Calm", base: "linear-gradient(135deg,#F6F3EC 0%,#F0EFEA 50%,#EAECEF 100%)", b1: "rgba(214,196,160,0.30)", b2: "rgba(168,196,190,0.28)" },
];

const SEL_STYLE: CSSProperties = {
  minWidth: 0, maxWidth: "56%", appearance: "none", WebkitAppearance: "none", backgroundColor: "rgba(255,255,255,0.55)",
  border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 32px 7px 14px",
  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%238F8F8F' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 13px center", cursor: "pointer",
  fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#303030", outline: "none",
};
const TXT_STYLE: CSSProperties = {
  minWidth: 0, flex: 1, maxWidth: "56%", background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3",
  padding: "4px 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030", outline: "none", textAlign: "right",
};

/* Two-column select/input grid — Voice §08, MLS §12, Display §13. */
function FieldGrid({ fields, vals, onVal }: { fields: Field[]; vals: Record<string, string>; onVal: (id: string, v: string) => void }) {
  return (
    <div style={{ borderTop: "1px solid #E3E3E3", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 60px" }}>
      {fields.map((f) => {
        const v = vals[f.id] ?? f.value;
        return (
          <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "12px 4px", borderBottom: "1px solid #E3E3E3" }}>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", flex: "none" }}>{f.label}</span>
            {f.opts ? (
              <select value={v} onChange={(e) => onVal(f.id, e.target.value)} style={SEL_STYLE}>
                {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={v} onChange={(e) => onVal(f.id, e.target.value)} style={TXT_STYLE} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Live Google Workspace connector (Phase 2) — real state from the BFF. */
function GoogleLiveCard() {
  const { google, connectGoogle, disconnectGoogle } = useAppState();
  const [test, setTest] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true); setTest(null);
    const [threads, events] = await Promise.all([fetchGmailThreads(5), fetchCalendarEvents(5)]);
    setTesting(false);
    if (threads === null && events === null) { setTest("No live read — reconnect or check the backend."); return; }
    setTest(`Gmail: ${threads?.length ?? "—"} threads · Calendar: ${events?.length ?? "—"} events`);
  };

  const { dot, label, tone } = !google.checked
    ? { dot: "#D9D9D9", label: "Checking connection…", tone: "#8F8F8F" }
    : !google.reachable
    ? { dot: "#B45309", label: "Backend offline — running in demo mode", tone: "#B45309" }
    : !google.configured
    ? { dot: "#B45309", label: "Backend up · Google not provisioned yet (phase2 guide §1–6)", tone: "#B45309" }
    : google.connected
    ? { dot: "#10A37F", label: `Connected · ${google.email ?? "signed in"}`, tone: "#10A37F" }
    : { dot: "#8F8F8F", label: "Not connected", tone: "#8F8F8F" };

  return (
    <div style={{ padding: "15px 4px", borderBottom: "1px solid #E3E3E3" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>Google Workspace <span style={{ fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10A37F" }}>· live</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: tone }}>{label}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          {google.connected ? (
            <>
              <button onClick={runTest} disabled={testing} className="st-chip" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>{testing ? "Reading…" : "Test live read"}</button>
              <button onClick={() => void disconnectGoogle()} className="st-chip" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Disconnect</button>
            </>
          ) : (
            <button onClick={connectGoogle} disabled={!(google.reachable && google.configured)} className="st-chip" style={{ background: google.reachable && google.configured ? "#E9E8E4" : "transparent", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 14px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: google.reachable && google.configured ? "pointer" : "not-allowed", opacity: google.reachable && google.configured ? 1 : 0.5 }}>Connect Google</button>
          )}
        </div>
      </div>
      {test && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", marginTop: 10 }}>{test}</div>}
    </div>
  );
}

/* Agent brain status (Phase 2) — Claude API via the BFF, else mock fallback. */
function AgentBrainCard() {
  const [status, setStatus] = useState<AgentStatus | null | undefined>(undefined);
  useEffect(() => { let alive = true; void getAgentStatus().then((s) => { if (alive) setStatus(s); }); return () => { alive = false; }; }, []);
  const { dot, label, tone } = status === undefined
    ? { dot: "#D9D9D9", label: "Checking…", tone: "#8F8F8F" }
    : status === null
    ? { dot: "#B45309", label: "Backend offline — running the mock agent", tone: "#B45309" }
    : status.configured
    ? { dot: "#10A37F", label: `Live · Claude API · ${status.model}`, tone: "#10A37F" }
    : { dot: "#8F8F8F", label: "Not provisioned — mock agent (add ANTHROPIC_API_KEY)", tone: "#8F8F8F" };
  return (
    <div style={{ padding: "15px 4px", borderBottom: "1px solid #E3E3E3" }}>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>Agent brain <span style={{ fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10A37F" }}>· live</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: tone }}>{label}</span>
      </div>
    </div>
  );
}

function SecHead({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
        <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 13, letterSpacing: "0.12em", color: "#8F8F8F" }}>{num}</span>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>{title}</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", marginBottom: 18 }}>{desc}</div>
    </>
  );
}
const Rows = ({ children }: { children: ReactNode }) => <div style={{ borderTop: "1px solid #E3E3E3" }}>{children}</div>;

export function Settings() {
  const { items: settingsRows } = useCollection<SettingsRec>("settings");
  const { items: contacts } = useCollection<Contact>("contacts");
  const [sec, setSec] = useState("03");
  const [econ, setEcon] = useState<Record<string, string>>({});
  const [vals, setVals] = useState<Record<string, string>>({});
  const onVal = (id: string, v: string) => setVals((s) => ({ ...s, [id]: v }));
  const [glass, setGlass] = useState("Sand & Ocean");
  const [pipes, setPipes] = useState<Pipes>(loadPipes);
  const [pipeSel, setPipeSel] = useState<string>(() => loadPipes().order[0]);
  const commitPipes = (next: Pipes, sel: string) => {
    setPipes(next); setPipeSel(sel);
    try { localStorage.setItem(PIPES_KEY, JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  };
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  useEffect(() => {
    const load = () => void getAuditLog().then(setAudit);
    load();
    return onDataChange(load);
  }, []);
  const settings = settingsRows[0];

  const autonomy = (settings?.autonomy_rules ?? {}) as Record<string, { label: string; desc: string; autonomous: boolean }>;
  const cadences = (settings?.cadences ?? {}) as Record<string, { label: string; desc: string; days: number }>;
  const profile = (settings?.profile ?? {}) as Record<string, string>;
  const contactTypes = (settings?.contact_types ?? []) as string[];
  const partners = useMemo(() => contacts.filter((c) => c.category === "partner"), [contacts]);

  const persist = (next: SettingsRec, action: string) => void save<SettingsRec>("settings", next, { actor: "user", skill: "compliance", action });

  const toggleAutonomy = (key: string) => {
    if (!settings) return;
    const cur = autonomy[key];
    const next = { ...settings, autonomy_rules: { ...autonomy, [key]: { ...cur, autonomous: !cur.autonomous } } };
    persist(next, `Autonomy · ${cur.label} → ${cur.autonomous ? "Ask first" : "Autonomous"}`);
  };
  const setCadenceDays = (key: string, days: number) => {
    if (!settings) return;
    const next = { ...settings, cadences: { ...cadences, [key]: { ...cadences[key], days } } };
    persist(next, `Cadence · ${cadences[key].label} → every ${days} days`);
  };
  /* Cadence + action plan per contact status — the loop Contact Detail reads. */
  const statusCadence = settings?.status_cadence ?? {};
  const cadenceFor = (s: string) => statusCadence[s] ?? STATUS_PLAY[s] ?? STATUS_PLAY["Not classified"];
  const setStatusCadence = (s: string, field: "cadence" | "action", value: string) => {
    if (!settings) return;
    const base = cadenceFor(s);
    const next = { ...settings, status_cadence: { ...statusCadence, [s]: { ...base, [field]: value } } };
    persist(next, `Status cadence · ${s} · ${field} updated`);
  };

  const navNumFor = (key: string) => String(NAV.findIndex(([k]) => k === key) + 1).padStart(2, "0");

  /* Pipeline & Stages editor (§11) — structured, persisted to localStorage. */
  const pSel = pipes.order.includes(pipeSel) ? pipeSel : pipes.order[0];
  const pStages = pipes.data[pSel] ?? [];
  const setStageArr = (arr: Stage[]) => commitPipes({ ...pipes, data: { ...pipes.data, [pSel]: arr } }, pSel);
  const addPipe = () => {
    let name = "New Pipeline", i = 2;
    while (pipes.order.includes(name)) name = `New Pipeline ${i++}`;
    commitPipes({ order: [...pipes.order, name], data: { ...pipes.data, [name]: [{ n: "Prospecting", p: 10 }, { n: "Won", p: 100 }, { n: "Lost", p: 0 }] } }, name);
  };
  const delPipe = (name: string) => {
    if (pipes.order.length <= 1) return;
    const order = pipes.order.filter((x) => x !== name);
    const data = { ...pipes.data }; delete data[name];
    commitPipes({ order, data }, order[0]);
  };
  const renamePipe = (nv: string) => {
    if (!nv || (pipes.order.includes(nv) && nv !== pSel)) return;
    const order = pipes.order.map((x) => (x === pSel ? nv : x));
    const data: Record<string, Stage[]> = {};
    pipes.order.forEach((x) => { data[x === pSel ? nv : x] = pipes.data[x]; });
    commitPipes({ order, data }, nv);
  };
  const addStage = () => setStageArr([...pStages, { n: "New Stage", p: 50 }]);

  return (
    <div style={{ display: "flex", gap: 52, padding: "8px 48px 80px", alignItems: "flex-start" }}>
      <div style={{ width: 200, flex: "none", position: "sticky", top: 24, paddingTop: 26 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", paddingBottom: 12, borderBottom: "1px solid #E3E3E3" }}>Sections</div>
        {NAV.map(([key, label], i) => {
          const on = sec === key;
          return (
            <div key={key} onClick={() => setSec(key)} onMouseEnter={() => setSec(key)} className="st-navrow" style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "9px 10px", margin: "0 -10px", cursor: "pointer", userSelect: "none", transition: "background 150ms", background: on ? "rgba(255,255,255,0.62)" : "transparent" }}>
              <span style={{ fontFamily: SANS, fontSize: 11, letterSpacing: "0.1em", width: 20, flex: "none", fontWeight: on ? 500 : 200, color: on ? "#0D0D0D" : "#8F8F8F" }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "#0D0D0D" : "#303030" }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, minWidth: 0, maxWidth: 1080 }}>
        <section style={{ marginTop: 26 }}>
          {/* 03 AGENT AUTONOMY */}
          {sec === "03" && (
            <>
              <SecHead num={navNumFor("03")} title="Agent Autonomy" desc="What the agent may do without asking. Everything else lands in Needs Your Decision." />
              <Rows>
                {AUTONOMY_ORDER.filter((k) => autonomy[k]).map((k) => {
                  const a = autonomy[k]; const on = a.autonomous;
                  return (
                    <div key={k} onClick={() => toggleAutonomy(k)} className="st-toggle" style={{ display: "flex", alignItems: "center", gap: 24, padding: "15px 4px", borderBottom: "1px solid #E3E3E3", cursor: "pointer", transition: "background 150ms" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{a.label}</div>
                        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", marginTop: 3 }}>{a.desc}</div>
                      </div>
                      <div style={{ width: 30, height: 14, flex: "none", borderRadius: 999, border: `0.5px solid ${on ? "#10A37F" : "#B4B4B4"}`, background: on ? "#10A37F" : "transparent", display: "flex", alignItems: "center", justifyContent: on ? "flex-end" : "flex-start", padding: 1, transition: "all 150ms" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: on ? "#FFFFFF" : "#8F8F8F", transition: "all 150ms" }} />
                      </div>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: on ? "#0D0D0D" : "#8F8F8F", width: 88, textAlign: "right", flex: "none" }}>{on ? "Autonomous" : "Ask first"}</span>
                    </div>
                  );
                })}
              </Rows>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, lineHeight: 1.6, color: "#B8B8B8", marginTop: 14 }}>Read at runtime by every skill — the Intelligence decision queue and each draft in Touch Today reflect these toggles instantly. Every change is logged (§ Agent Ledger).</div>
            </>
          )}

          {/* 02 CADENCE */}
          {sec === "02" && (
            <>
              <SecHead num={navNumFor("02")} title="Cadence Rules" desc="The clocks that drive Touch Today. An inbound touch resets the clock." />
              <Rows>
                {CADENCE_ORDER.filter((k) => cadences[k]).map((k) => {
                  const c = cadences[k];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 24, padding: "15px 4px", borderBottom: "1px solid #E3E3E3" }}>
                      <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: CADENCE_DOT[k] ?? "#8F8F8F" }} />
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0D0D0D", width: 90, flex: "none" }}>{c.label}</span>
                      <span style={{ flex: 1, fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#5D5D5D" }}>{c.desc}</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: "none" }}>
                        <span style={{ fontFamily: SANS, fontSize: 12, color: "#8F8F8F" }}>every</span>
                        <input type="number" min={1} value={c.days} onChange={(e) => setCadenceDays(k, parseInt(e.target.value, 10) || 1)} style={{ width: 44, background: "transparent", border: "none", borderBottom: "1px solid #D9D9D9", fontFamily: SANS, fontWeight: 200, fontSize: 18, color: "#0D0D0D", padding: "0 0 2px", outline: "none", textAlign: "center" }} />
                        <span style={{ fontFamily: SANS, fontSize: 12, color: "#8F8F8F" }}>days</span>
                      </div>
                    </div>
                  );
                })}
              </Rows>

              {/* Cadence & action plan per contact status — read live by Contact Detail */}
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D0D0D", margin: "34px 0 4px", paddingBottom: 10, borderBottom: "1px solid #E3E3E3" }}>Cadence &amp; action plan by status</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", margin: "8px 0 14px" }}>What each status arms when you set it on a contact — the Contact file shows this live. Edit inline; auto-saved.</div>
              {CANON_STATUS.map((s) => {
                const c = cadenceFor(s);
                return (
                  <div key={s} style={{ display: "grid", gridTemplateColumns: "120px 150px 1fr", gap: 18, alignItems: "center", padding: "13px 4px", borderBottom: "1px solid #E3E3E3" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>{s}</span>
                    <input value={c.cadence} onChange={(e) => setStatusCadence(s, "cadence", e.target.value)} placeholder="e.g. Every 3 days" className="st-cadinput" style={{ background: "transparent", border: "none", borderBottom: "1px solid #D9D9D9", fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D", padding: "5px 0", outline: "none" }} />
                    <input value={c.action} onChange={(e) => setStatusCadence(s, "action", e.target.value)} placeholder="Action plan the agent runs" className="st-cadinput" style={{ background: "transparent", border: "none", borderBottom: "1px solid #D9D9D9", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", padding: "5px 0", outline: "none" }} />
                  </div>
                );
              })}
            </>
          )}

          {/* 01 PROFILE */}
          {sec === "01" && (
            <>
              <SecHead num={navNumFor("01")} title="Profile" desc="The identity the system writes with — drafts, documents, signatures." />
              <div style={{ borderTop: "1px solid #E3E3E3", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 60px" }}>
                {[["Name", profile.name], ["Role", profile.role], ["Brokerage", profile.brokerage], ["License", profile.license], ["Phone · WhatsApp", profile.phone], ["Email", profile.email], ["Draft languages", profile.draft_languages], ["Signature", profile.signature]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, padding: "14px 4px", borderBottom: "1px solid #E3E3E3", minWidth: 0 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", flex: "none" }}>{l}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 18 CONTACT TYPES */}
          {sec === "18" && (
            <>
              <SecHead num={navNumFor("18")} title="Contact Types" desc="Who the person is to the business — the agent uses types for matching, language and playbooks." />
              <div style={{ borderTop: "1px solid #E3E3E3", paddingTop: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {["Buyer", "Seller", "Tenant", "Landlord", "Investor", "Developer", ...contactTypes].map((t) => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", border: "1px solid #E3E3E3", borderRadius: 999, background: "rgba(255,255,255,0.5)", padding: "6px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}>{t}</span>
                ))}
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#B8B8B8", marginTop: 14 }}>base types are fixed · custom types become available on every contact · every change is logged</div>
            </>
          )}

          {/* 04 ECONOMICS */}
          {sec === "04" && (
            <>
              <SecHead num={navNumFor("04")} title="Economics" desc="Defaults used in every GCI projection. Overridable per deal." />
              <div style={{ borderTop: "1px solid #E3E3E3", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 60px" }}>
                {ECON.map((f) => (
                  <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "12px 4px", borderBottom: "1px solid #E3E3E3" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", flex: "none" }}>{f.label}</span>
                    <input value={econ[f.label] ?? f.value} onChange={(e) => setEcon((s) => ({ ...s, [f.label]: e.target.value }))} style={{ minWidth: 0, flex: 1, maxWidth: "56%", background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3", padding: "4px 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030", outline: "none", textAlign: "right" }} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 16 TEAM & ACCESS */}
          {sec === "16" && (
            <>
              <SecHead num={navNumFor("16")} title="Team & Access" desc="Who sits at the seat, and what each role can see. The Principal seat sees everything." />
              <Rows>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 24, padding: "16px 4px", borderBottom: "1px solid #E3E3E3" }}>
                  <div style={{ width: 130, flex: "none" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>Wictor Arraes</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8F8F8F", marginTop: 3 }}>Principal</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 8 }}>Sees</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["Everything — full system", "Agent approvals & autonomy", "All financials & forecasts", "Off-market inventory", "KYC & sensitive fields"].map((s) => <span key={s} style={{ border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", background: "rgba(255,255,255,0.5)" }}>{s}</span>)}
                    </div>
                  </div>
                </div>
              </Rows>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#B8B8B8", marginTop: 14 }}>Use "View as" in the sidebar to preview the workspace scoped to Sales Agent, Admin, Transaction Coordinator, Marketing or Referral Partner.</div>
            </>
          )}

          {/* 17 REFERRAL PARTNERS */}
          {sec === "17" && (
            <>
              <SecHead num={navNumFor("17")} title="Referral Partners" desc="Registered partners with a signed agreement — the only sources you can assign a referral origin to." />
              <Rows>
                {partners.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "14px 4px", borderBottom: "1px solid #E3E3E3" }}>
                    <div>
                      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>{p.name}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", marginTop: 2 }}>{p.relationship} · {p.location}</div>
                    </div>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10A37F", border: "1px solid #E3E3E3", borderRadius: 999, padding: "4px 10px" }}>Agreement on file · 25% · §6</span>
                  </div>
                ))}
                {partners.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", padding: "14px 4px" }}>No registered partners yet.</div>}
              </Rows>
            </>
          )}

          {/* 05 INTEGRATIONS */}
          {sec === "05" && (
            <>
              <SecHead num={navNumFor("05")} title="Integrations" desc="Connectors the agent works through. Google is live via the BFF; the rest are mocked behind adapters." />
              <Rows>
                <GoogleLiveCard />
                <AgentBrainCard />
                {CONNECTORS.filter((c) => c.name !== "Google Workspace").map((c) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "15px 4px", borderBottom: "1px solid #E3E3E3" }}>
                    <div>
                      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>{c.name}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", marginTop: 2 }}>{c.kind}</div>
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: c.on ? "#10A37F" : "#8F8F8F" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c.on ? "#10A37F" : "#D9D9D9" }} />{c.on ? "Connected" : "Not connected"}</span>
                  </div>
                ))}
              </Rows>
            </>
          )}

          {/* Representative sections */}
          {sec === "11" && (
            <>
              <SecHead num={navNumFor("11")} title="Pipeline & Stages" desc="The shape of the funnel is yours to define — the agent obeys it." />
              <div style={{ borderTop: "1px solid #E3E3E3" }}>
                {/* pipeline tabs */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 26, padding: "16px 4px 0", flexWrap: "wrap" }}>
                  {pipes.order.map((name) => {
                    const active = name === pSel;
                    return (
                      <div key={name} onClick={() => setPipeSel(name)} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontWeight: active ? 400 : 300, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "#0D0D0D" : "#8F8F8F", paddingBottom: 7, borderBottom: `1px solid ${active ? "#0D0D0D" : "transparent"}`, cursor: "pointer", transition: "color 150ms" }}>
                        <span>{name}</span>
                        {pipes.order.length > 1 && <span onClick={(e) => { e.stopPropagation(); delPipe(name); }} title="Delete pipeline" className="st-pipex" style={{ fontSize: 11, color: "#8F8F8F", cursor: "pointer", transition: "color 150ms" }}>×</span>}
                      </div>
                    );
                  })}
                  <div onClick={addPipe} className="st-pipeadd" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F", paddingBottom: 7, cursor: "pointer", transition: "color 150ms" }}>+ Pipeline</div>
                </div>

                {/* pipeline name */}
                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, padding: "16px 4px 13px", borderBottom: "1px solid #E3E3E3", alignItems: "center" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>Pipeline name</span>
                  <input value={pSel} onChange={(e) => renamePipe(e.target.value)} style={{ width: 280, background: "transparent", border: "none", borderBottom: "1px solid #D9D9D9", padding: "4px 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", outline: "none" }} />
                </div>

                {/* stage rows */}
                {pStages.map((s, i) => (
                  <div key={i} className="st-stagerow" style={{ display: "flex", alignItems: "center", gap: 18, padding: "11px 4px", borderBottom: "1px solid #E3E3E3", transition: "background 150ms" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 12, letterSpacing: "0.1em", color: "#8F8F8F", width: 24, flex: "none" }}>{String(i + 1).padStart(2, "0")}</span>
                    <input value={s.n} onChange={(e) => { const a = [...pStages]; a[i] = { ...a[i], n: e.target.value }; setStageArr(a); }} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", borderBottom: "0.5px solid transparent", padding: "4px 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", outline: "none" }} />
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flex: "none" }}>
                      <input type="number" min={0} max={100} value={s.p} onChange={(e) => { const a = [...pStages]; a[i] = { ...a[i], p: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }; setStageArr(a); }} style={{ width: 44, background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3", fontFamily: SANS, fontWeight: 200, fontSize: 15, color: "#0D0D0D", padding: "0 0 2px", outline: "none", textAlign: "center" }} />
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>%</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flex: "none" }}>
                      <span onClick={() => { if (i === 0) return; const a = [...pStages]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setStageArr(a); }} title="Move up" className="st-stagebtn" style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E3E3E3", fontFamily: SANS, fontSize: 11, color: i === 0 ? "#E3E3E3" : "#8F8F8F", cursor: "pointer", transition: "all 150ms" }}>↑</span>
                      <span onClick={() => { if (i === pStages.length - 1) return; const a = [...pStages]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; setStageArr(a); }} title="Move down" className="st-stagebtn" style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E3E3E3", fontFamily: SANS, fontSize: 11, color: i === pStages.length - 1 ? "#E3E3E3" : "#8F8F8F", cursor: "pointer", transition: "all 150ms" }}>↓</span>
                      <span onClick={() => setStageArr(pStages.filter((_, x) => x !== i))} title="Delete stage" className="st-stagedel" style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E3E3E3", fontFamily: SANS, fontSize: 12, color: "#8F8F8F", cursor: "pointer", transition: "all 150ms" }}>×</span>
                    </div>
                  </div>
                ))}

                {/* add stage */}
                <div onClick={addStage} className="st-addstage" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 4px", borderBottom: "1px solid #E3E3E3", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", cursor: "pointer", transition: "all 150ms" }}>+ Add stage</div>

                {/* stage-level rules */}
                {SET_STAGE_FIELDS.map((f) => {
                  const v = vals[f.id] ?? f.value;
                  return (
                    <div key={f.id} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, padding: "13px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "center" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.04em", color: "#0D0D0D" }}>{f.label}</span>
                      {f.opts ? (
                        <select value={v} onChange={(e) => onVal(f.id, e.target.value)} style={{ ...SEL_STYLE, maxWidth: 320, justifySelf: "start" }}>
                          {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input value={v} onChange={(e) => onVal(f.id, e.target.value)} style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3", padding: "4px 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030", outline: "none" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {sec === "12" && (
            <>
              <SecHead num={navNumFor("12")} title="MLS & Matching" desc="How the nightly sweep hunts — and how much it may say without you." />
              <FieldGrid fields={SET_MLS} vals={vals} onVal={onVal} />
            </>
          )}
          {sec === "08" && (
            <>
              <SecHead num={navNumFor("08")} title="Voice & Templates" desc="Every draft the agent writes obeys these rules — the brand speaks with one voice." />
              <FieldGrid fields={SET_VOICE} vals={vals} onVal={onVal} />
            </>
          )}
          {sec === "07" && (
            <>
              <SecHead num={navNumFor("07")} title="Scoring & Forecast" desc="The formulas behind every number on the Command Center — tunable, never opaque." />
              <div style={{ borderTop: "1px solid #E3E3E3" }}>
                {SET_SCORING.map((r) => (
                  <div key={r.label} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, padding: "15px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "baseline" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.04em", color: "#0D0D0D" }}>{r.label}</span>
                    <div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{r.value}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F", marginTop: 3 }}>{r.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {sec === "13" && (
            <>
              <SecHead num={navNumFor("13")} title="Display & Locale" desc="How the instrument reads." />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14, borderTop: "1px solid #E3E3E3", padding: "16px 4px", borderBottom: "1px solid #E3E3E3" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13.5, color: "#0D0D0D" }}>Liquid Glass — ambient background</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", marginTop: 3 }}>The wallpaper behind the glass. Applies live across the whole system.</div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-start" }}>
                  {GLASS.map((g) => {
                    const act = g.name === glass;
                    return (
                      <div key={g.name} onClick={() => setGlass(g.name)} style={{ cursor: "pointer", textAlign: "center", userSelect: "none" }}>
                        <div style={{ width: 56, height: 36, borderRadius: 9, background: `radial-gradient(circle at 28% 22%,${g.b1},transparent 62%),radial-gradient(circle at 76% 82%,${g.b2},transparent 62%),${g.base}`, border: `2px solid ${act ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.08)"}`, boxShadow: act ? "0 0 0 1.5px rgba(0,0,0,0.22), 0 4px 14px rgba(0,0,0,0.14)" : "none", transition: "all 150ms" }} />
                        <div style={{ fontFamily: SANS, fontSize: 10, marginTop: 6, letterSpacing: "0.02em", fontWeight: act ? 600 : 400, color: act ? "#0D0D0D" : "#8F8F8F" }}>{g.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <FieldGrid fields={SET_DISPLAY} vals={vals} onVal={onVal} />
            </>
          )}
          {sec === "09" && (
            <>
              <SecHead num={navNumFor("09")} title="Data & Privacy" desc="Retention, the private vault, and export rights." />
              <Rows><RepLines lines={["Agent Ledger — insert-only · 7-year retention · action rollback for 30 days", "Private vault — commission economics & sensitive notes · Principal-only · no agent output may use it", "LGPD / CCPA — per-contact data export on request", "Nothing reaches a client without human approval (Law 1)"]} /></Rows>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 8px" }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D" }}>Agent Ledger · live audit trail</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>{audit.length} entries · insert-only · actor · action · timestamp</span>
              </div>
              <div style={{ borderTop: "1px solid #E3E3E3" }}>
                {audit.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", padding: "12px 4px" }}>No entries yet — every approval, edit, send, status change and file drop lands here.</div>}
                {audit.slice(0, 40).map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "11px 4px", borderBottom: "1px solid #ECECEC" }}>
                    <span style={{ flex: "none", width: 52, fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: e.actor === "agent" ? "#10A37F" : "#8F8F8F" }}>{e.actor}</span>
                    <span style={{ flex: "none", width: 96, fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>{e.skill ? e.skill.replace(/_/g, " ") : ""}</span>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: "#303030" }}>{e.action}</span>
                    <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#B8B8B8" }}>{e.created_at.slice(11, 16)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function RepLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l) => (
        <div key={l} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "13px 4px", borderBottom: "1px solid #E3E3E3" }}>
          <span style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: "#0D0D0D", position: "relative", top: 5 }} />
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.55, color: "#303030" }}>{l}</span>
        </div>
      ))}
    </>
  );
}
