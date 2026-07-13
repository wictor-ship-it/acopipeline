import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getAuditLog, recordAction } from "../../data/repository";
import { useCollection } from "../../data/hooks";
import { isRemote } from "../../data/backend";
import type { AuditEntry, Contact, Opportunity, Transaction } from "../../domain/types";
import { useAgentItems } from "../../agent/useAgentItems";
import { resolveAgentItem } from "../../agent/resolve";
import { SKILL_LABELS } from "../../domain/agent";
import { SANS } from "../contacts/data";
import { useNavigate } from "react-router-dom";
import {
  AGENT_LEDGER, DELTAS, fmtK, FORECAST,
  LEARNED, NA_BUCKET_DOT, NA_BUCKET_META,
  NA_FILTERS, NA_PROPOSALS, NA_SEQUENCES, NET_CADENCE, NET_KPIS, NET_SUMMARY,
  PROPOSALS, RECIP_HEAD, RECIP_ROWS,
  TOUCH_TODAY, VENDOR_HEAD, VENDOR_ROWS, WEEKLY_MOVEMENT,
} from "./data";
import type { NaTask, RiskItem } from "./data";
import "./Intelligence.css";

/* ================= SCREEN 5 · INTELLIGENCE (fragment 05) =================
   Collapsible-block daily cockpit. Defaults (intelSecDefaults ~3348):
   Act Now + Risk open; Plays/Performance/Agent collapsed. */

function Block({ dot, title, badge, hint, open, onToggle, children }: { dot?: string; title: string; badge?: string; hint?: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="in-block" style={{ marginTop: 16, borderRadius: 12, overflow: "hidden" }}>
      <div onClick={onToggle} className="in-blockhdr" style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", cursor: "pointer", userSelect: "none", transition: "background 150ms" }}>
        <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms", fontFamily: SANS, fontWeight: 300, fontSize: 13, color: "#8F8F8F" }}>›</span>
        {dot && <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: dot }} />}
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: "#0D0D0D" }}>{title}</span>
        {badge && <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11, color: "#5D5D5D", background: "rgba(255,255,255,0.55)", borderRadius: 999, padding: "2px 9px" }}>{badge}</span>}
        <span style={{ flex: 1 }} />
        {hint && <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "56%" }}>{hint}</span>}
      </div>
      {open && <div style={{ borderTop: "1px solid #F0F0F0" }}>{children}</div>}
    </div>
  );
}

const budgetM = (b?: string): number => { if (!b || /\/mo/i.test(b)) return 0; const n = parseFloat(b.replace(/[^0-9.]/g, "")) || 0; return /b/i.test(b) ? n * 1000 : /k/i.test(b) ? n / 1000 : n; };
const fmtM = (m: number): string => (m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : m >= 1 ? `$${m.toFixed(1)}M` : `$${Math.round(m * 1000)}K`);

export function Intelligence() {
  const navigate = useNavigate();
  const { items: opportunities } = useCollection<Opportunity>("opportunities");
  const { items: transactions } = useCollection<Transaction>("transactions");
  const { items: contacts } = useCollection<Contact>("contacts");

  /* Hero KPIs computed from the real pipeline (0 until you add deals). */
  const hero = useMemo(() => {
    const isOpen = (o: Opportunity) => !["Won", "Lost", "Placed"].includes(o.stage);
    const open = opportunities.filter(isOpen);
    const won = opportunities.filter((o) => o.stage === "Won" || o.stage === "Placed");
    const lost = opportunities.filter((o) => o.stage === "Lost");
    const pipeline = open.reduce((s, o) => s + budgetM(o.budget), 0);
    const weightedGci = open.reduce((s, o) => s + budgetM(o.budget) * ((o.probability ?? 0) / 100), 0) * 0.03;
    const closedYtd = won.reduce((s, o) => s + budgetM(o.budget), 0) * 0.03;
    const hot = open.filter((o) => (o.heat ?? "").toUpperCase() === "HOT" || o.stage === "Hot").length;
    const overdue = open.filter((o) => o.overdue === true).length;
    const winRate = won.length + lost.length ? Math.round((won.length * 100) / (won.length + lost.length)) : 0;
    return { open, won, lost, pipeline, weightedGci, closedYtd, hot, overdue, winRate };
  }, [opportunities]);

  const moneyStrip = [
    { label: "Pipeline", value: fmtM(hero.pipeline), sub: `${hero.open.length} open` },
    { label: "Weighted GCI", value: fmtM(hero.weightedGci), sub: "probability-adj" },
    { label: "Closed YTD", value: fmtM(hero.closedYtd), sub: `${hero.won.length} won` },
    { label: "Next 30 Days", value: "—", sub: "closings" },
  ];
  const heroSub = [
    { label: "HOT Leads", value: String(hero.hot), sub: `of ${hero.open.length}` },
    { label: "Overdue Actions", value: String(hero.overdue), sub: "in pipeline" },
    { label: "Win Rate · YTD", value: `${hero.winRate}%`, sub: `${hero.won.length} of ${hero.won.length + hero.lost.length}` },
    { label: "Avg Deal Cycle", value: "—", sub: "offer → close" },
    { label: "Referral Share", value: "—", sub: "of new pipeline" },
    { label: "Agent · Overnight", value: "—", sub: "actions logged" },
  ];
  const morningBrief = `${hero.open.length} open deal${hero.open.length === 1 ? "" : "s"} · ${fmtM(hero.pipeline)} pipeline · ${hero.hot} hot — the agent watches for what needs you`;
  void transactions;

  const isUnclassified = (c: Contact) => (c.directory_status ?? "").toLowerCase() === "not classified" || (!c.directory_status && !c.status);

  /* Risk Radar — real: overdue open deals (empty when none). */
  const realRisk: RiskItem[] = useMemo(() => hero.open.filter((o) => o.overdue === true).slice(0, 8).map((o) => ({
    id: o.id, lead: o.name ?? o.contact_name ?? "Deal", sev: "#D0342C", tag: "OVERDUE", clock: o.next_due || "overdue",
    gciK: Math.round(budgetM(o.budget) * ((o.probability ?? 0) / 100) * 0.03 * 1000),
    note: `Next action overdue — ${o.next_action ?? "no next step set"}.`, remedy: "Advance the next step or re-touch the contact", act: "Open deal",
  })), [hero.open]);

  /* Opportunity Plays — real heuristic moves from your book (empty when nothing applies). */
  const realPlays = useMemo(() => {
    const out: Array<{ idx: string; title: string; body: string }> = [];
    const unclassified = contacts.filter(isUnclassified).length;
    const noNext = hero.open.filter((o) => !o.next_action).length;
    if (unclassified > 0) out.push({ idx: "01", title: "Classify your book", body: `${unclassified.toLocaleString()} imported contact${unclassified === 1 ? "" : "s"} are unclassified — classifying arms their cadence and surfaces who to touch.` });
    if (noNext > 0) out.push({ idx: "02", title: "Set next steps", body: `${noNext} open deal${noNext === 1 ? "" : "s"} have no next action — set one to keep momentum.` });
    if (hero.hot > 0) out.push({ idx: "03", title: "Work the hot deals", body: `${hero.hot} hot deal${hero.hot === 1 ? "" : "s"} in play — prioritize the next touch today.` });
    return out;
  }, [contacts, hero.open, hero.hot]);

  /* Pipeline health — real hygiene + classification (0 with no pipeline). */
  const health = useMemo(() => {
    const withNext = hero.open.filter((o) => o.next_action && o.next_due).length;
    const hygiene = hero.open.length ? Math.round((withNext / hero.open.length) * 100) : 0;
    const classified = contacts.filter((c) => !isUnclassified(c)).length;
    const coverage = contacts.length ? Math.round((classified / contacts.length) * 100) : 0;
    const overduePct = hero.open.length ? Math.round((hero.overdue / hero.open.length) * 100) : 0;
    const score = hero.open.length === 0 ? 0 : Math.round(hygiene * 0.5 + (100 - overduePct) * 0.3 + Math.min(coverage, 100) * 0.2);
    return { score, factors: [
      { label: "Deal hygiene", value: `${withNext}/${hero.open.length}`, w: `${hygiene}%` },
      { label: "Overdue", value: String(hero.overdue), w: `${overduePct}%` },
      { label: "Book classified", value: `${coverage}%`, w: `${coverage}%` },
      { label: "Velocity", value: "—", w: "0%" },
    ] };
  }, [hero, contacts]);

  const [metricsOpen, setMetricsOpen] = useState(false);
  const [sec, setSec] = useState({ act: true, touch: true, next: true, learned: true, risk: true, plays: false, perf: false, agent: false, net: false });
  const toggle = (k: keyof typeof sec) => setSec((s) => ({ ...s, [k]: !s[k] }));
  const [naDone, setNaDone] = useState<Record<string, "accepted" | "dismissed">>({});
  const [lnDone, setLnDone] = useState<Record<string, boolean>>({});
  // Demo-only content (hardcoded proposals/learnings) — empty on a real account.
  const naOpen = isRemote() ? [] : NA_PROPOSALS.filter((p) => !naDone[p.id]);
  const lnOpen = isRemote() ? [] : LEARNED.filter((l) => !lnDone[l.id]);
  const acceptNa = (id: string, label: string) => { setNaDone((d) => ({ ...d, [id]: "accepted" })); void recordAction({ actor: "user", skill: "chief_of_staff", action: `Follow-up accepted — ${label}` }, `na/${id}`, () => setNaDone((d) => { const n = { ...d }; delete n[id]; return n; })); void getAuditLog().then(setAudit); };
  const dismissNa = (id: string) => setNaDone((d) => ({ ...d, [id]: "dismissed" }));
  const saveLn = (id: string, audit: string) => { setLnDone((d) => ({ ...d, [id]: true })); void recordAction({ actor: "user", skill: "transaction_coordinator", action: audit }, `learned/${id}`, () => setLnDone((d) => { const n = { ...d }; delete n[id]; return n; })); void getAuditLog().then(setAudit); };

  /* Natural-language quick add — the agent parses contact, type and date. */
  const [naQuick, setNaQuick] = useState("");
  const [userTasks, setUserTasks] = useState<NaTask[]>([]);
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({});
  const [naFilter, setNaFilter] = useState("all");
  const [resched, setResched] = useState<Record<string, { due: string; bucket: string; tag: string }>>({});
  const [naCollapsed, setNaCollapsed] = useState<Record<string, boolean>>({});
  const [riskDone, setRiskDone] = useState<Record<string, boolean>>({});
  const [riskSnooze, setRiskSnooze] = useState<Record<string, boolean>>({});
  const [playOpened, setPlayOpened] = useState<Record<string, boolean>>({});
  const parseTask = (raw: string) => {
    const lo = raw.toLowerCase();
    const nameMap: Array<[string, string]> = [["marcelo", "Marcelo C. · Rivage PH"], ["keller", "Family Office · Zurich"], ["zurich", "Family Office · Zurich"], ["sterling", "Sterling · Acqualina 4802"], ["bittencourt", "A. Bittencourt"], ["ana ", "A. Bittencourt"], ["nakamura", "Nakamura · Bal Harbour 1503"], ["ravel", "Faena 8C · Ravel"], ["alvarez", "Alvarez · Continuum 2904"]];
    const hit = nameMap.find(([k]) => lo.includes(k));
    const type = /call|ligar|ligação/.test(lo) ? "Call" : /whats|message|msg|mensagem|follow/.test(lo) ? "Message" : /tour|showing|visita/.test(lo) ? "Showing" : /send|enviar|doc|contract|package/.test(lo) ? "Document" : "Task";
    let due = "Jul 08", bucket = "week";
    if (/today|hoje/.test(lo)) { due = "Jul 06"; bucket = "today"; }
    else if (/tomorrow|amanh/.test(lo)) { due = "Jul 07"; bucket = "week"; }
    else if (/friday|sexta/.test(lo)) { due = "Jul 10"; bucket = "week"; }
    else if (/monday|segunda|next week|semana que vem/.test(lo)) { due = "Jul 13"; bucket = "later"; }
    return { id: `u${Date.now()}`, name: hit ? hit[1] : "General", action: raw, type, wgci: "", due, bucket };
  };
  const addTask = () => {
    const raw = naQuick.trim();
    if (!raw) return;
    const task = parseTask(raw);
    setUserTasks((u) => [task, ...u]);
    setNaQuick("");
    void recordAction({ actor: "user", skill: "chief_of_staff", action: `Task created · ${task.name} — ${task.type} due ${task.due} (agent-parsed)` }, `task/${task.id}`, () => setUserTasks((u) => u.filter((x) => x.id !== task.id)));
    void getAuditLog().then(setAudit);
  };
  const [decided, setDecided] = useState<Record<string, "approved" | "dismissed" | "snoozed">>({});
  const [selMonth, setSelMonth] = useState("SEP");
  const [whatIf, setWhatIf] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  useEffect(() => { void getAuditLog().then(setAudit); }, []);
  /* Task Log · Today — today's audit_log entries (Law 2), reactive to actions. */
  const todayISO = new Date().toISOString().slice(0, 10);
  const taskLog = audit.filter((e) => e.created_at.slice(0, 10) === todayISO).slice(0, 20);

  /* Ranked task list — user-added + seed, with reschedule overrides applied. */
  const naAll: NaTask[] = [...userTasks].map((a) => {
    const r = resched[a.id];
    return r ? { ...a, due: r.due, bucket: r.bucket } : a;
  });
  const naOpenTasks = naAll.filter((a) => !taskDone[a.id]);
  const naSummary: Array<[string, number]> = [
    ["Overdue", naOpenTasks.filter((t) => t.bucket === "overdue").length],
    ["Today", naOpenTasks.filter((t) => t.bucket === "today").length],
    ["This Week", naOpenTasks.filter((t) => t.bucket === "week").length],
    ["Open", naOpenTasks.length],
  ];
  const naFiltered = naAll.filter((a) => naFilter === "all" || a.type === naFilter);
  const naGroups = NA_BUCKET_META.map(([b, label]) => ({ bucket: b, label, items: naFiltered.filter((a) => a.bucket === b) })).filter((g) => g.items.length);
  const toggleTask = (t: NaTask) => {
    const nowDone = !taskDone[t.id];
    setTaskDone((d) => ({ ...d, [t.id]: nowDone }));
    if (nowDone) void recordAction({ actor: "user", skill: "chief_of_staff", action: `Task done · ${t.name} — ${t.action}` }, `taskdone/${t.id}`, () => setTaskDone((d) => ({ ...d, [t.id]: false })));
    void getAuditLog().then(setAudit);
  };
  const reschedTask = (t: NaTask, due: string, bucket: string, tag: string) => {
    const prev = resched[t.id];
    setResched((r) => ({ ...r, [t.id]: { due, bucket, tag } }));
    void recordAction({ actor: "user", skill: "chief_of_staff", action: `Task rescheduled ${tag} · ${t.name} → ${due}` }, `resched/${t.id}/${tag}`, () => setResched((r) => { const n = { ...r }; if (prev) n[t.id] = prev; else delete n[t.id]; return n; }));
    void getAuditLog().then(setAudit);
  };

  /* Risk Radar — live (un-snoozed) items, total GCI exposed, approve/snooze. */
  const riskLive = realRisk.filter((d) => !riskSnooze[d.id]);
  const riskExposureK = riskLive.reduce((n, d) => n + d.gciK, 0);
  const riskExposure = riskExposureK >= 1000 ? `$${(riskExposureK / 1000).toFixed(1)}M` : `$${riskExposureK}K`;
  const approveRisk = (d: RiskItem) => {
    if (riskDone[d.id]) return;
    setRiskDone((s) => ({ ...s, [d.id]: true }));
    void recordAction({ actor: "user", skill: "senior_advisor", action: `Risk Radar · remedy approved — ${d.lead} · ${d.remedy}` }, `risk-approve/${d.id}`, () => setRiskDone((s) => ({ ...s, [d.id]: false })));
    void getAuditLog().then(setAudit);
  };
  const snoozeRisk = (d: RiskItem) => {
    setRiskSnooze((s) => ({ ...s, [d.id]: true }));
    void recordAction({ actor: "user", skill: "senior_advisor", action: `Risk Radar · snoozed 7 days — ${d.lead} · resurfaces Jul 16` }, `risk-snooze/${d.id}`, () => setRiskSnooze((s) => ({ ...s, [d.id]: false })));
    void getAuditLog().then(setAudit);
  };
  const openPlay = (title: string) => {
    if (playOpened[title]) return;
    setPlayOpened((s) => ({ ...s, [title]: true }));
    void recordAction({ actor: "user", skill: "senior_advisor", action: `Opportunity play · brief opened — ${title}` }, `play/${title}`, () => setPlayOpened((s) => ({ ...s, [title]: false })));
    void getAuditLog().then(setAudit);
  };

  /* the mock agent's items routed to Needs Your Decision (§12) flow through
     this same queue — the compliance block etc. appear alongside the seeds. */
  const { items: agentItems } = useAgentItems();
  const agentDecisions = agentItems.filter((i) => i.needsDecision && decided[i.id] !== "snoozed");

  const proposals = isRemote() ? [] : PROPOSALS.filter((p) => decided[p.id] !== "snoozed");
  const openCount = proposals.filter((p) => !decided[p.id]).length + agentDecisions.filter((i) => !decided[i.id]).length;

  const decide = (id: string, kind: "approved" | "dismissed" | "snoozed", label: string) => {
    setDecided((d) => ({ ...d, [id]: kind }));
    void recordAction({ actor: "user", skill: "senior_advisor", action: `Decision queue · ${kind} — ${label}` }, `decision/${id}`, () => setDecided((d) => { const n = { ...d }; delete n[id]; return n; }));
    void getAuditLog().then(setAudit);
  };
  const decideAgent = (id: string, kind: "approved" | "dismissed" | "snoozed") => {
    const item = agentItems.find((i) => i.id === id);
    setDecided((d) => ({ ...d, [id]: kind }));
    if (item) void resolveAgentItem(item, kind === "approved" ? "approved" : kind === "dismissed" ? "skipped" : "skipped", () => setDecided((d) => { const n = { ...d }; delete n[id]; return n; }));
    void getAuditLog().then(setAudit);
  };
  const approveAll = () => proposals.filter((p) => !decided[p.id]).forEach((p) => decide(p.id, "approved", p.label));

  /* Keyboard-driven queue processing (§02 "one-tap day"): ↑↓/jk navigate ·
     ⏎ approve · S skip. A focused item is highlighted; keys ignore text inputs. */
  const queue = useMemo(() => [
    ...proposals.filter((p) => !decided[p.id]).map((p) => ({ kind: "prop" as const, id: p.id, label: p.label })),
    ...agentDecisions.filter((i) => !decided[i.id]).map((i) => ({ kind: "agent" as const, id: i.id, label: `${SKILL_LABELS[i.skill]} · ${i.title}` })),
  ], [proposals, agentDecisions, decided]);
  const [focusIdx, setFocusIdx] = useState(0);
  useEffect(() => { setFocusIdx((f) => Math.min(f, Math.max(0, queue.length - 1))); }, [queue.length]);
  const focusedId = queue[focusIdx]?.id;
  const approveFocused = () => { const q = queue[focusIdx]; if (!q) return; q.kind === "prop" ? decide(q.id, "approved", q.label) : decideAgent(q.id, "approved"); };
  const skipFocused = () => { const q = queue[focusIdx]; if (!q) return; q.kind === "prop" ? decide(q.id, "dismissed", q.label) : decideAgent(q.id, "dismissed"); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sec.act || queue.length === 0) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); setFocusIdx((f) => Math.min(f + 1, queue.length - 1)); }
      else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); setFocusIdx((f) => Math.max(f - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); approveFocused(); }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); skipFocused(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sec.act, queue, focusIdx]);
  const qIndexOf = (id: string) => queue.findIndex((q) => q.id === id);

  /* forecast — what-if moves the Rivage slip from SEP to OCT */
  const months = useMemo(() => {
    const m = FORECAST.map((f) => ({ ...f, deals: [...f.deals] }));
    if (whatIf) {
      const sep = m.find((x) => x.m === "SEP")!; const oct = m.find((x) => x.m === "OCT")!;
      const i = sep.deals.findIndex((d) => d.slip);
      if (i > -1) oct.deals.push(...sep.deals.splice(i, 1));
    }
    const withTot = m.map((f) => ({ ...f, tot: f.deals.reduce((n, d) => n + d.v, 0) }));
    const max = Math.max(...withTot.map((f) => f.tot), 1);
    return withTot.map((f) => ({ ...f, gci: fmtK(f.tot), h: `${Math.max(Math.round((f.tot / max) * 100), 2)}%` }));
  }, [whatIf]);
  const selData = months.find((f) => f.m === selMonth) ?? months[0];

  return (
    <div style={{ padding: "28px 48px 60px" }}>
      {/* MORNING BRIEF */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "2px 0 18px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Morning brief</span>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{morningBrief}</span>
        </div>
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B8B8B8" }}>scroll = the whole day · decide → do → discoveries → log</span>
      </div>

      {/* HERO */}
      <div className="in-block" style={{ borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr" }}>
          <div style={{ padding: "26px 26px 24px", borderRight: "1px solid #E3E3E3" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Pipeline Health</span>
              <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5D5D5D" }}>Strong ↑</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
              <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 44, lineHeight: 1, color: "#0D0D0D" }}>{health.score}</span>
              <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 16, color: "#8F8F8F" }}>/100</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginTop: 20 }}>
              {health.factors.map((f) => (
                <div key={f.label}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.06em", color: "#8F8F8F" }}>{f.label}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, color: "#5D5D5D" }}>{f.value}</span>
                  </div>
                  <div style={{ height: 2, background: "#E3E3E3" }}><div style={{ height: 2, borderRadius: 999, width: f.w, background: "#0D0D0D" }} /></div>
                </div>
              ))}
            </div>
          </div>
          {moneyStrip.map((m) => (
            <div key={m.label} style={{ padding: "26px 22px 24px", borderRight: "1px solid #E3E3E3" }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{m.label}</div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 30, lineHeight: 1, marginTop: 16, color: "#0D0D0D" }}>{m.value}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D", marginTop: 12 }}>{m.sub}</div>
            </div>
          ))}
        </div>
        {metricsOpen && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", borderTop: "1px solid #F0F0F0", padding: "16px 22px 18px" }}>
            {heroSub.map((s) => (
              <div key={s.label} style={{ paddingRight: 20 }}>
                <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5D5D5D" }}>{s.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 7 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 19, color: "#0D0D0D" }}>{s.value}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, color: "#5D5D5D" }}>{s.sub}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div onClick={() => setMetricsOpen((o) => !o)} className="in-blockhdr" style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderTop: "1px solid #F0F0F0", cursor: "pointer", userSelect: "none", transition: "background 150ms" }}>
          <span style={{ display: "inline-block", transform: metricsOpen ? "rotate(90deg)" : "none", transition: "transform 150ms", fontFamily: SANS, fontWeight: 300, fontSize: 13, color: "#8F8F8F" }}>›</span>
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, color: "#5D5D5D" }}>{metricsOpen ? "Hide metrics" : "More metrics"}</span>
        </div>
      </div>

      {/* ACT NOW */}
      <Block dot="#D0342C" title="Act Now" badge={openCount > 0 ? String(openCount) : undefined} hint="the only queue that needs you" open={sec.act} onToggle={() => toggle("act")}>
        <div style={{ padding: "20px 22px 26px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Needs Your Decision</span>
              {openCount > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.03em", color: "#B8B8B8" }}>
                  <span className="in-kbd">↑↓</span> navigate<span className="in-kbd">⏎</span> approve<span className="in-kbd">S</span> skip
                </span>
              )}
            </div>
            {openCount > 1 && <button onClick={approveAll} className="in-approveall" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "6px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Approve all · {openCount}</button>}
          </div>
          {openCount === 0 && (
            <div className="in-empty" style={{ borderRadius: 10, padding: "28px 32px", marginBottom: 12 }}>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#0D0D0D" }}>Nothing awaits your judgment.</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.6, color: "#5D5D5D", marginTop: 6 }}>Approved items are queued and executing. The agent will surface the next decision as it forms.</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", margin: "0 -22px", borderTop: "1px solid #ECECEC" }}>
            {proposals.map((p) => {
              const st = decided[p.id];
              return (
                <div key={p.id} onClick={() => { const qi = qIndexOf(p.id); if (qi >= 0) setFocusIdx(qi); }} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #ECECEC", borderLeft: `${p.id === focusedId ? 3 : 2}px solid ${p.id === focusedId ? "#0D0D0D" : "#D0342C"}`, background: p.id === focusedId ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)", padding: "16px 22px", cursor: "pointer", transition: "background 120ms" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{p.id === focusedId && <span style={{ color: "#0D0D0D", marginRight: 6 }}>▸</span>}{p.label}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.6, color: "#303030", marginTop: 10 }}>{p.body}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.55, fontStyle: "italic", color: "#8F8F8F", marginTop: 8 }}>{p.why}</div>
                  {!st && (
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      <button onClick={() => decide(p.id, "approved", p.label)} className="in-approve" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Approve</button>
                      <button className="in-ghost" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Edit</button>
                      <button onClick={() => decide(p.id, "dismissed", p.label)} className="in-ghost" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Dismiss</button>
                      <button onClick={() => decide(p.id, "snoozed", p.label)} className="in-ghost" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Snooze</button>
                    </div>
                  )}
                  {st === "approved" && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D0D0D" }} /><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.08em", color: "#0D0D0D" }}>Approved · queued to clipboard</span></div>}
                  {st === "dismissed" && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.08em", color: "#8F8F8F", marginTop: 16 }}>Dismissed</div>}
                </div>
              );
            })}
            {/* live agent items routed to Needs Your Decision (from AgentService) */}
            {agentDecisions.map((it) => {
              const st = decided[it.id];
              return (
                <div key={it.id} onClick={() => { const qi = qIndexOf(it.id); if (qi >= 0) setFocusIdx(qi); }} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #ECECEC", borderLeft: `${it.id === focusedId ? 3 : 2}px solid ${it.id === focusedId ? "#0D0D0D" : "#D0342C"}`, background: it.id === focusedId ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)", padding: "16px 22px", cursor: "pointer", transition: "background 120ms" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{it.id === focusedId && <span style={{ color: "#0D0D0D", marginRight: 6 }}>▸</span>}{SKILL_LABELS[it.skill]} · {it.title}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10A37F", border: "1px solid #E3E3E3", borderRadius: 999, padding: "1px 7px" }}>agent · live</span>
                  </div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.6, color: "#303030", marginTop: 10 }}>{it.context}</div>
                  {it.block && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.55, fontStyle: "italic", color: "#8F8F8F", marginTop: 8 }}>Compliance holds {SKILL_LABELS[it.block.blockedSkill]}'s "{it.block.action}" — {it.block.reason}.</div>}
                  {!st && (
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      <button onClick={() => decideAgent(it.id, "approved")} className="in-approve" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Override · release</button>
                      <button onClick={() => decideAgent(it.id, "dismissed")} className="in-ghost" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Uphold hold</button>
                      <button onClick={() => decideAgent(it.id, "snoozed")} className="in-ghost" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Snooze</button>
                    </div>
                  )}
                  {st === "approved" && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D0D0D" }} /><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.08em", color: "#0D0D0D" }}>Released · logged to the ledger</span></div>}
                  {st === "dismissed" && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.08em", color: "#8F8F8F", marginTop: 16 }}>Hold upheld</div>}
                </div>
              );
            })}
          </div>
        </div>
      </Block>

      {/* TOUCH TODAY · COMMUNICATIONS */}
      {!isRemote() && (<Block dot="#D0342C" title="Touch Today · Communications" badge={String(TOUCH_TODAY.length)} hint="agent read the context, planned and drafted — review → approve → it sends" open={sec.touch} onToggle={() => toggle("touch")}>
        <div style={{ padding: "8px 22px 20px" }}>
          {TOUCH_TODAY.map((t) => (
            <div key={t.name} onClick={() => navigate("/contacts?view=queue")} className="in-touchrow" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 4px", borderBottom: "1px solid #ECECEC", cursor: "pointer", transition: "background 150ms" }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: t.dot }} />
              <span style={{ flex: "none", width: 48, fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.1em", color: "#8F8F8F" }}>{t.tag}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{t.name}</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#5D5D5D", marginTop: 2 }}>{t.ctx}</div></div>
              <span style={{ flex: "none", width: 60, textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D" }}>{t.wgci}</span>
              <span style={{ flex: "none", width: 84, textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.04em", color: t.dueColor }}>{t.due}</span>
            </div>
          ))}
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", marginTop: 12 }}>Open the full ranked queue in Contacts · Touch Today — bulk approve by channel, each send in the contact's language.</div>
        </div>
      </Block>)}

      {/* NEXT ACTIONS */}
      <Block dot="#0D0D0D" title="Next Actions" badge={naOpen.length > 0 ? String(naOpen.length) : undefined} hint="the agent proposes the follow-ups — you accept, it schedules & chases" open={sec.next} onToggle={() => toggle("next")}>
        <div style={{ padding: "8px 22px 20px" }}>
          {/* summary band */}
          <div style={{ display: "grid", overflowX: "auto", gridTemplateColumns: "repeat(4,minmax(120px,1fr))", borderRadius: 12, background: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 6px 22px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.7)", marginTop: 8 }}>
            {naSummary.map(([label, value], i) => (
              <div key={label} style={{ padding: "20px 22px", borderRight: i < 3 ? "1px solid #E3E3E3" : "none" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{label}</div>
                <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 34, lineHeight: 1, marginTop: 14, color: "#0D0D0D" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* quick add · natural language */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid #D9D9D9", padding: "14px 18px", marginTop: 22 }}>
            <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 16, color: "#8F8F8F" }}>+</span>
            <input value={naQuick} onChange={(e) => setNaQuick(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} placeholder="Type it as you'd say it — “call Marcelo Friday about the schedule” · the agent parses contact, type and date" className="in-quick" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }} />
            <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.08em", color: "#8F8F8F", flex: "none" }}>↵ create</span>
          </div>

          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", margin: "22px 0 6px" }}>Proposed follow-ups</div>
          {naOpen.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, fontStyle: "italic", color: "#8F8F8F", padding: "8px 0" }}>All proposals handled — the agent surfaces the next as it forms.</div>}
          {naOpen.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 2px", borderBottom: "1px solid #ECECEC" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: "#303030" }}>{p.text}</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 3 }}>{p.type} · {p.name} · due {p.due}</div></div>
              <button onClick={() => acceptNa(p.id, `${p.name} — ${p.type} due ${p.due}`)} className="in-approve" style={{ flex: "none", background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 14px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Accept</button>
              <button onClick={() => dismissNa(p.id)} className="in-ghost" style={{ flex: "none", background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Dismiss</button>
            </div>
          ))}
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", margin: "20px 0 8px" }}>Agent-run sequences</div>
          {NA_SEQUENCES.map((q) => (
            <div key={q.id} style={{ padding: "10px 2px", borderBottom: "1px solid #ECECEC" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{q.name}</span><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>{q.rule}</span></div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {q.steps.map((s) => <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontWeight: 400, fontSize: 11, color: s.st === "future" ? "#8F8F8F" : "#303030" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: s.st === "done" ? "#0D0D0D" : s.st === "current" ? "#B45309" : "#D9D9D9" }} />{s.label}</span>)}
              </div>
            </div>
          ))}

          {/* filters + ranked task groups */}
          <div style={{ display: "flex", gap: 22, padding: "22px 2px 2px", flexWrap: "wrap" }}>
            {NA_FILTERS.map(([label, id]) => {
              const active = naFilter === id;
              const count = id === "all" ? naAll.length : naAll.filter((a) => a.type === id).length;
              return (
                <div key={id} onClick={() => setNaFilter(id)} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: active ? "#0D0D0D" : "#8F8F8F", paddingBottom: 5, borderBottom: `1px solid ${active ? "#0D0D0D" : "transparent"}`, cursor: "pointer", transition: "color 150ms" }}>
                  {label} <span style={{ fontSize: 10, color: "#8F8F8F", letterSpacing: "0.04em" }}>{count}</span>
                </div>
              );
            })}
          </div>
          {naGroups.length === 0 && (
            <div style={{ border: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)", padding: "24px 28px", marginTop: 22 }}>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#0D0D0D" }}>Day clear.</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", marginTop: 5 }}>Nothing due, nothing overdue. The agent keeps watch — next scheduled action lands tomorrow.</div>
            </div>
          )}
          {naGroups.map((g) => {
            const collapsed = !!naCollapsed[g.bucket];
            return (
              <div key={g.bucket} style={{ marginTop: 26 }}>
                <div onClick={() => setNaCollapsed((c) => ({ ...c, [g.bucket]: !c[g.bucket] }))} style={{ display: "flex", alignItems: "baseline", gap: 12, borderBottom: "1px solid #E3E3E3", paddingBottom: 10, cursor: "pointer" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, lineHeight: 1, color: "#8F8F8F", width: 12, flex: "none" }}>{collapsed ? "›" : "⌄"}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "#0D0D0D" }}>{g.label}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{g.items.length}</span>
                </div>
                {!collapsed && g.items.map((a) => {
                  const done = !!taskDone[a.id];
                  const tag = resched[a.id]?.tag;
                  const parsed = a.id.startsWith("u");
                  return (
                    <div key={a.id} className="in-touchrow" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 4px 14px 10px", borderBottom: "1px solid #E3E3E3", transition: "background 150ms" }}>
                      <div onClick={() => toggleTask(a)} style={{ width: 15, height: 15, flex: "none", border: `0.5px solid ${done ? "#0D0D0D" : "#8F8F8F"}`, background: done ? "#0D0D0D" : "transparent", cursor: "pointer", transition: "background 150ms" }} />
                      <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: NA_BUCKET_DOT[a.bucket] }} />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: done ? "#8F8F8F" : "#0D0D0D", textDecoration: done ? "line-through" : "none" }}>{a.name}</span>
                          {parsed && <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#8F8F8F", fontStyle: "italic" }}>agent-parsed</span>}
                          {tag && <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5D5D5D" }}>rescheduled {tag}</span>}
                        </div>
                        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: done ? "#8F8F8F" : "#303030", textDecoration: done ? "line-through" : "none" }}>{a.action}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, flex: "none" }}>
                        {([["+1d", "Jul 07", "week"], ["+3d", "Jul 09", "week"], ["+1w", "Jul 13", "later"]] as const).map(([lbl, due, bk]) => (
                          <span key={lbl} onClick={() => reschedTask(a, due, bk, lbl)} title={`Push ${lbl}`} className="in-resched" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#8F8F8F", border: "1px solid #E3E3E3", borderRadius: 6, padding: "4px 7px", cursor: "pointer", transition: "all 150ms" }}>{lbl}</span>
                        ))}
                      </div>
                      <span style={{ width: 96, flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{a.type}</span>
                      <span style={{ width: 60, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: done ? "#8F8F8F" : "#0D0D0D" }}>{a.wgci}</span>
                      <span style={{ width: 64, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: done ? "#8F8F8F" : a.bucket === "overdue" ? "#D0342C" : "#5D5D5D" }}>{a.due}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* task log · audit trail — every change is an activity on the record (Law 2) */}
          <div style={{ marginTop: 34 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "1px solid #E3E3E3", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "#0D0D0D" }}>Task Log · Today</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, fontStyle: "italic", color: "#5D5D5D" }}>every change is an activity on the record</span>
              </div>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Auditable · reversible</span>
            </div>
            {taskLog.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, fontStyle: "italic", color: "#8F8F8F", padding: "12px 4px" }}>Nothing logged yet today — accept a follow-up or add a task above and it lands here.</div>}
            {taskLog.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "11px 4px", borderBottom: "1px solid #E3E3E3" }}>
                <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 11, letterSpacing: "0.08em", color: "#8F8F8F", width: 40, flex: "none" }}>{e.created_at.slice(11, 16)}</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{e.action}</span>
              </div>
            ))}
          </div>
        </div>
      </Block>

      {/* AGENT LEARNED */}
      <Block dot="#10A37F" title="Agent Learned" badge={lnOpen.length > 0 ? String(lnOpen.length) : undefined} hint="extractions from your conversations — you arbitrate, the CRM fills itself" open={sec.learned} onToggle={() => toggle("learned")}>
        <div style={{ padding: "8px 22px 18px" }}>
          {lnOpen.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, fontStyle: "italic", color: "#8F8F8F", padding: "14px 2px 2px" }}>Nothing waiting — new learnings land here after every call, message and showing.</div>}
          {lnOpen.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 2px", borderBottom: "1px solid #ECECEC" }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8F8F8F" }}>{l.src}</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: "#303030", marginTop: 3 }}>{l.text}</div></div>
              <button onClick={() => saveLn(l.id, l.audit)} className="in-approve" style={{ flex: "none", background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 14px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>{l.saveLabel}</button>
              <button onClick={() => setLnDone((d) => ({ ...d, [l.id]: true }))} className="in-ghost" style={{ flex: "none", background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Dismiss</button>
            </div>
          ))}
        </div>
      </Block>

      {/* RISK RADAR */}
      <Block dot="#B45309" title="Risk Radar" badge={riskLive.length > 0 ? String(riskLive.length) : undefined} hint={riskLive.length > 0 ? `${riskExposure} GCI exposed across ${riskLive.length}` : "all clear"} open={sec.risk} onToggle={() => toggle("risk")}>
        <div style={{ padding: "2px 22px 22px" }}>
          {riskLive.map((r) => {
            const done = !!riskDone[r.id];
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 2px", borderBottom: "1px solid #ECECEC", flexWrap: "wrap" }}>
                <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: r.sev }} />
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13.5, color: "#0D0D0D" }}>{r.lead}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8, letterSpacing: "0.14em", color: r.sev }}>{r.tag}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>{r.clock} · ${r.gciK}K GCI exposed</span>
                  </div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.55, color: "#5D5D5D", marginTop: 3 }}>{r.note}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 5 }}>
                    <span style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: "#10A37F", position: "relative", top: -2 }} />
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#303030" }}>{r.remedy}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flex: "none", alignItems: "center" }}>
                  {done ? (
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10A37F" }}>Sent ✓ · agent watches</span>
                  ) : (
                    <button onClick={() => approveRisk(r)} className="in-approve" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 14px", fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>{r.act}</button>
                  )}
                  <button onClick={() => snoozeRisk(r)} className="in-snooze" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "all 150ms" }}>Snooze 7d</button>
                </div>
              </div>
            );
          })}
          {riskLive.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 2px" }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: "#10A37F" }} />
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#5D5D5D" }}>All clear — nothing aging past threshold. The agent keeps watching and resurfaces snoozed items automatically.</span>
            </div>
          )}
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 12 }}>Thresholds — HOT 14d · WARM 30d · Listing 21d · tune in Settings › Scoring &amp; Forecast</div>
        </div>
      </Block>

      {/* OPPORTUNITY realPlays */}
      <Block title="Opportunity Plays" badge={String(realPlays.length)} hint="agent-proposed moves" open={sec.plays} onToggle={() => toggle("plays")}>
        <div style={{ padding: "20px 22px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
          {realPlays.map((p) => {
            const opened = !!playOpened[p.title];
            return (
              <div key={p.idx} style={{ border: "1px solid #E3E3E3", borderRadius: 10, padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32 }}>
                <div style={{ maxWidth: 720 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14.5, color: "#0D0D0D" }}>{p.title}</span>
                  <p style={{ margin: "10px 0 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: "#303030" }}>{p.body}</p>
                </div>
                {opened ? (
                  <span style={{ flex: "none", whiteSpace: "nowrap", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10A37F" }}>Brief opened ✓</span>
                ) : (
                  <button onClick={() => openPlay(p.title)} className="in-openbrief" style={{ background: "transparent", border: "1px solid #B4B4B4", borderRadius: 999, padding: "9px 17px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", flex: "none", whiteSpace: "nowrap", transition: "background 150ms" }}>Open brief</button>
                )}
              </div>
            );
          })}
        </div>
      </Block>

      {/* PERFORMANCE */}
      {!isRemote() && (<Block title="Performance" hint="forecast · movement · activity" open={sec.perf} onToggle={() => toggle("perf")}>
        <div style={{ padding: "20px 22px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32, alignItems: "start" }}>
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>GCI Forecast</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                  <div onClick={() => setWhatIf((w) => !w)} style={{ fontFamily: SANS, fontWeight: whatIf ? 400 : 300, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: whatIf ? "#D0342C" : "#8F8F8F", cursor: "pointer", borderBottom: `1px solid ${whatIf ? "#D0342C" : "transparent"}`, paddingBottom: 2 }}>{whatIf ? "What-if ON · Rivage → Oct" : "What-if · Rivage slips to Oct?"}</div>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Weighted · 6 months</span>
                </div>
              </div>
              <div style={{ border: "1px solid #E3E3E3", borderRadius: 10, padding: "24px 26px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                  {months.map((b) => {
                    const on = b.m === selMonth;
                    return (
                      <div key={b.m} onClick={() => setSelMonth(b.m)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 10, cursor: "pointer", height: 150 }}>
                        <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 120 }}><div style={{ width: "100%", height: b.h, minHeight: 2, background: on ? "#0D0D0D" : "#D8D8D8", transition: "background 150ms" }} /></div>
                        <span style={{ fontFamily: SANS, fontWeight: on ? 400 : 300, fontSize: 10, letterSpacing: "0.08em", color: on ? "#0D0D0D" : "#8F8F8F" }}>{b.m}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #E3E3E3" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0D0D0D" }}>{selData.m} · Expected closings</span>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#0D0D0D" }}>{selData.gci}</span>
                  </div>
                  {selData.deals.map((d) => (
                    <div key={d.n} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #E3E3E3" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{d.n}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>${d.v}K</span>
                    </div>
                  ))}
                  {selData.deals.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", padding: "9px 0" }}>No expected closings this month.</div>}
                </div>
              </div>
            </section>
            <section>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Weekly Movement</span>
              <p style={{ margin: "14px 0 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.7, color: "#303030" }}>{WEEKLY_MOVEMENT}</p>
              <div style={{ border: "1px solid #E3E3E3", borderRadius: 10, overflow: "hidden", marginTop: 18 }}>
                {DELTAS.map((d) => (
                  <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 22px", borderBottom: "1px solid #E3E3E3" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5D5D5D" }}>{d.label}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 15, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </Block>)}

      {/* AGENT ACTIVITY */}
      {!isRemote() && (<Block title="Agent Activity" badge={String(AGENT_LEDGER.length)} hint="overnight ledger · learning loop · auditable" open={sec.agent} onToggle={() => toggle("agent")}>
        <div style={{ padding: "20px 22px 24px" }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", marginBottom: 12 }}>Overnight ledger</div>
          {AGENT_LEDGER.map((a) => (
            <div key={a.time} style={{ display: "flex", gap: 14, padding: "11px 0", borderBottom: "1px solid #ECECEC" }}>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", flex: "none", width: 44 }}>{a.time}</span>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10A37F", flex: "none", width: 74 }}>{a.tag}</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: "#303030" }}>{a.text}</span>
            </div>
          ))}
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", margin: "22px 0 12px" }}>Agent Ledger · your decisions ({audit.length})</div>
          {audit.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F" }}>No actions yet — approve a decision above and it appears here (insert-only · 7-year retention).</div>}
          {audit.slice(0, 12).map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: "1px solid #ECECEC" }}>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: e.actor === "agent" ? "#10A37F" : "#8F8F8F", flex: "none", width: 54 }}>{e.actor}</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: "#303030" }}>{e.action}</span>
            </div>
          ))}
        </div>
      </Block>)}

      {/* NETWORK · Vendors & Partners */}
      {!isRemote() && (<Block title="Network — Vendors & Partners" hint={sec.net ? "directory lives in Contacts · Partners / Vendors" : NET_SUMMARY} open={sec.net} onToggle={() => toggle("net")}>
        <div style={{ padding: "2px 22px 28px" }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: "1px solid #E3E3E3", borderRadius: 10, overflow: "hidden", margin: "20px 0 30px" }}>
            {NET_KPIS.map((k, i) => (
              <div key={k.label} style={{ padding: "24px 24px 22px", borderRight: i < 3 ? "1px solid #E3E3E3" : "none" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{k.label}</div>
                <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 30, lineHeight: 1, marginTop: 14, color: "#0D0D0D" }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Vendor Scorecard */}
          <section style={{ marginBottom: 38 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Vendor Scorecard</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Measured from transaction groups · nobody else measures this</span>
            </div>
            <div style={{ borderTop: "1px solid #E3E3E3", overflowX: "auto" }}>
              <div style={{ display: "grid", minWidth: 760, gridTemplateColumns: "1.2fr 1fr 0.8fr 0.6fr 0.8fr 1.5fr 1.2fr", padding: "13px 4px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                {VENDOR_HEAD.map((h) => <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>)}
              </div>
              {VENDOR_ROWS.map((v) => (
                <div key={v.name} className="in-touchrow" style={{ display: "grid", minWidth: 760, gridTemplateColumns: "1.2fr 1fr 0.8fr 0.6fr 0.8fr 1.5fr 1.2fr", padding: "16px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "baseline", transition: "background 150ms" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{v.name}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{v.role}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{v.deals}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{v.ontime}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{v.resp}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: v.slaColor }}>{v.sla}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F" }}>{v.cad}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Reciprocity Ledger */}
          <section style={{ marginBottom: 38 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Reciprocity Ledger</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Who sends · who receives · what the balance asks for</span>
            </div>
            <div style={{ borderTop: "1px solid #E3E3E3", overflowX: "auto" }}>
              <div style={{ display: "grid", minWidth: 760, gridTemplateColumns: "1.2fr 1.1fr 0.9fr 0.6fr 1.8fr", padding: "13px 4px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                {RECIP_HEAD.map((h) => <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>)}
              </div>
              {RECIP_ROWS.map((r) => (
                <div key={r.name} className="in-touchrow" style={{ display: "grid", minWidth: 760, gridTemplateColumns: "1.2fr 1.1fr 0.9fr 0.6fr 1.8fr", padding: "16px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "baseline", transition: "background 150ms" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{r.name}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{r.got}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.gave}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: r.balColor }}>{r.bal}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, fontStyle: "italic", color: "#5D5D5D" }}>↳ {r.move}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Network Cadence */}
          <section>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Network Cadence</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Relationship with who closes with you is future pipeline</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: "1px solid #E3E3E3", borderRadius: 10, overflow: "hidden" }}>
              {NET_CADENCE.map((c, i) => (
                <div key={i} style={{ padding: "18px 20px", borderRight: i < NET_CADENCE.length - 1 ? "1px solid #E3E3E3" : "none" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 18, color: "#0D0D0D" }}>{c.when}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: c.statusColor }}>{c.status}</span>
                  </div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D", marginTop: 12 }}>{c.who}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.55, color: "#5D5D5D", marginTop: 5 }}>{c.what}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Block>)}
    </div>
  );
}
