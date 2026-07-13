import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { recordAction, save, newId } from "../../data/repository";
import { useCollection } from "../../data/hooks";
import type { Opportunity, Contact, Pipeline, Settings } from "../../domain/types";
import { SANS, deltaCell } from "../contacts/data";
import {
  type Card, CLOSED_HEAD, COLL_PIPES, type Column, mkCard, DEAL_STATUS, DEAL_PLAY, DEFAULT_LOSS_REASONS, normStatus,
  PEEK_CURATED, PIPE_NAMES, PIPE_REF, tagsFor, WEEK_DAYS, fmtBudget, dealTypeOf,
} from "./data";
import "./Opportunities.css";

/* ================= SCREEN 2 · PIPELINE (fragment 02) ================= */

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const STAGE_OV_KEY = "aco-board-stage-ov";

type Sort = "weighted" | "budget" | "prob" | "due" | "name";
const CMP: Record<Sort, (a: Card, b: Card) => number> = {
  weighted: (a, b) => b.weightedNum - a.weightedNum, budget: (a, b) => b.budgetNum - a.budgetNum,
  prob: (a, b) => b.probNum - a.probNum, due: (a, b) => a.dueRank - b.dueRank, name: (a, b) => a.name.localeCompare(b.name),
};

function buildPeek(c: Card) {
  const isRental = /\/mo/.test(c.budget);
  const isInv = /Investor/.test(c.opp);
  const side = /Seller|Listing|Staging|Marketing/.test(c.opp + " " + (c.stage ?? "")) ? "Listing · seller side" : /Tenant|Lease/.test(c.opp) ? "Rental" : isInv ? "Investment · Capital division" : "Purchase · buyer side";
  const gciNum = isRental ? c.budgetNum : c.budgetNum * (isInv ? 10 : 30); // GCI in $K
  const fmtK = (k: number) => (k >= 1000 ? `$${(k / 1000).toFixed(1)}M` : `$${Math.round(k)}K`);
  const gciStr = isRental ? `${fmtK(c.budgetNum)} · one month` : `${fmtK(gciNum)} · ${isInv ? "1%" : "3%"}`;
  const wGciStr = fmtK((gciNum * c.probNum) / 100);
  const cur = PEEK_CURATED[c.name];
  const contacts = (cur?.contacts ?? [[c.name.split("·")[0].trim() || "Principal", isInv ? "Investor · principal" : "Principal"], ["Listing agent — co-broke", "Counterparty"], ["A/CO TC", "Transaction support"]]).map(([n, r]) => ({ n, r, initials: initials(n) }));
  const acts = (cur?.acts ?? [["Jul 05", `Next action set — ${c.next}`], ["Jul 01", "Touch logged · WhatsApp — client responsive"], ["Jun 24", `Moved to ${c.stage} · playbook cadence attached`]]).map(([d, t]) => ({ d, t }));
  const dues = (cur?.dues ?? [[c.next, c.due], ["Cadence touch — agent-run", "T+7d"], ["Re-qualify if no response", "T+21d"]]).map(([l, d], i) => ({ l, d, dColor: i === 0 ? c.dueColor : "#8F8F8F" }));
  return { name: c.name, stage: c.stage ?? "", status: c.status, side, dot: c.dot, budget: fmtBudget(c.budget), gci: gciStr, wGci: wGciStr, probLabel: `${c.prob} probability`, address: cur?.address ?? c.name.split("·")[0].trim(), specs: cur?.specs ?? (isInv ? "Commercial asset · OM + rent roll on file" : "On file"), ppsf: cur?.ppsf ?? "—", delivery: cur?.delivery ?? `${c.stage} · ${c.opp}`, contacts, acts, dues };
}

export function Opportunities() {
  const navigate = useNavigate();
  const { items: opportunities } = useCollection<Opportunity>("opportunities");
  const { items: contacts } = useCollection<Contact>("contacts");
  const { items: settingsRows } = useCollection<Settings>("settings");
  const lossReasons = settingsRows[0]?.loss_reasons ?? DEFAULT_LOSS_REASONS;
  const [collPipe, setCollPipe] = useState("all");
  const [viewSel, setViewSel] = useState<"board" | "list" | "week">("board");
  const sort: Sort = "weighted"; // board is value-ranked; no user-facing sort control here
  const [query, setQuery] = useState("");
  const [peek, setPeek] = useState<Card | null>(null);
  const [refDecided, setRefDecided] = useState<null | "accepted" | "declined">(null);
  const [closedSeg, setClosedSeg] = useState<"won" | "lost">("won");
  /* Board drag-to-stage: stage overrides (card name → stage), persisted to
     localStorage so a move survives reload. */
  const [stageOv, setStageOvState] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(STAGE_OV_KEY) || "{}") as Record<string, string>; } catch { return {}; }
  });
  const setStageOv = (updater: (prev: Record<string, string>) => Record<string, string>) =>
    setStageOvState((prev) => { const next = updater(prev); try { localStorage.setItem(STAGE_OV_KEY, JSON.stringify(next)); } catch { /* ignore */ } return next; });
  const [dragCard, setDragCard] = useState<{ id?: string; name: string; from: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const view = collPipe === "all" ? (viewSel === "week" ? "week" : "list") : viewSel;
  const matchQ = (c: Card) => !query.trim() || (c.name + " " + c.opp).toLowerCase().includes(query.trim().toLowerCase());

  /* Real opportunities → board cards. This is what makes the pipeline reflect
     your actual deals (created below), not demo seed. */
  const oppCards: Card[] = useMemo(() => opportunities.map((o) => {
    const contact = contacts.find((c) => c.id === o.contact_id);
    const name = o.name ?? o.contact_name ?? contact?.name ?? "Untitled deal";
    const label = o.card_label ?? o.source ?? "Opportunity";
    const st = normStatus(o.stage);
    const hot = st === "Hot" || st === "Won";
    const base = mkCard(name, label, o.budget ?? "$0", hot, o.probability ?? 0, o.next_action ?? "Set the next step", o.next_due ?? "", o.overdue ?? false);
    return { ...base, stage: st, pipeName: PIPE_NAMES[o.pipeline] ?? o.pipeline, pipeKey: o.pipeline, id: o.id };
  }), [opportunities, contacts]);

  /* Columns built from the real cards, bucketed into the canonical stage order
     (reused from the demo pipeline definitions). Board drag applies a per-session
     stage override keyed by card id. */
  const columns: Column[] = useMemo(() => {
    const stageOrder = [...DEAL_STATUS];
    const inScope = oppCards.filter((c) => collPipe === "all" || c.pipeKey === collPipe);
    const effStage = (c: Card) => normStatus((c.id ? stageOv[c.id] : undefined) ?? c.stage);
    return stageOrder.map((st) => ({
      stage: st,
      cards: inScope.filter((c) => effStage(c) === st).map((c) => ({ ...c, tags: tagsFor(c) })).filter(matchQ).sort(CMP[sort]),
    }));
  }, [oppCards, collPipe, sort, query, stageOv]);

  const allCards = columns.flatMap((c) => c.cards);
  const isRent = collPipe === "rentals";
  const openCount = columns.filter((c) => c.stage !== "Won" && c.stage !== "Lost").reduce((s, c) => s + c.cards.length, 0);
  const wonCount = columns.find((c) => c.stage === "Won")?.cards.length ?? 0;
  const lostCount = columns.find((c) => c.stage === "Lost")?.cards.length ?? 0;
  const moneyCards = allCards.filter((c) => !/\/mo/.test(c.budget));
  const valM = moneyCards.reduce((s, c) => s + c.budgetNum, 0);
  const wgtM = moneyCards.reduce((s, c) => s + c.weightedNum, 0);
  const sumBudget = allCards.reduce((s, c) => s + c.budgetNum, 0);
  const sumWeighted = allCards.reduce((s, c) => s + c.weightedNum, 0);
  const feeRate = collPipe === "investments" ? 0.01 : collPipe === "all" ? 0.028 : 0.03;
  const gciM2 = wgtM * feeRate;
  const repVal = isRent ? `$${Math.round(sumBudget)}K/mo` : `$${valM.toFixed(1)}M`;
  const repWgt = isRent ? `$${Math.round(sumWeighted)}K/mo` : `$${wgtM.toFixed(1)}M`;
  const repGci = isRent ? `$${Math.round(sumWeighted)}K` : gciM2 >= 1 ? `$${gciM2.toFixed(1)}M` : `$${Math.round(gciM2 * 1000)}K`;
  const winRate = wonCount + lostCount ? Math.round((wonCount * 100) / (wonCount + lostCount)) : 0;

  /* Closed deals from real data: opportunities in Won/Placed vs Lost stages. */
  const feeOf = (pk?: string) => (pk === "investments" ? 0.01 : 0.03);
  const wonCards = oppCards.filter((c) => c.stage === "Won" || c.stage === "Placed");
  const wonRows = wonCards.map((c) => ({
    name: c.name, asset: c.pipeName ?? "—", closed: c.due || "—", volume: fmtBudget(c.budget),
    gci: `$${Math.round(c.budgetNum * feeOf(c.pipeKey) * 1000)}K`, post: "—", postColor: "#8F8F8F",
  }));
  const wonGciM = wonCards.reduce((s, c) => s + c.budgetNum * feeOf(c.pipeKey), 0);
  const wonGciLabel = wonGciM >= 1 ? `$${wonGciM.toFixed(1)}M` : `$${Math.round(wonGciM * 1000)}K`;
  const lostRows = oppCards.filter((c) => c.stage === "Lost").map((c) => ({ name: c.name, pipe: c.pipeName ?? "—", budget: fmtBudget(c.budget), when: c.due || "—", reason: c.next || "—" }));

  // Real values; trend deltas show "—" (no historical snapshots to trend against).
  const r0 = (v: string) => ({ v, d30: "—", dQ: "—", dY: "—" });
  const wonVolM = wonCards.reduce((s, c) => s + c.budgetNum, 0);
  const reports = collPipe === "closed"
    ? [
        { label: "Closed Deals", sub: "2026 year to date", m: r0(String(wonRows.length)), inv: false },
        { label: "Closed Volume", sub: "realized · YTD", m: r0(`$${wonVolM.toFixed(1)}M`), inv: false },
        { label: "Realized GCI", sub: "booked · YTD", m: r0(wonGciLabel), inv: false },
        { label: "Avg Days to Close", sub: "contract → close", m: r0("—"), inv: true },
        { label: "Referrals from Closed", sub: "post-sale engine", m: r0("—"), inv: false },
      ]
    : [
        { label: "Opportunities", sub: "open · pre-close", m: r0(String(openCount)), inv: false },
        { label: isRent ? "Rent Roll" : "Pipeline Value", sub: isRent ? "monthly · open leases" : "gross volume", m: r0(repVal), inv: false },
        { label: "Weighted Value", sub: "probability-adjusted", m: r0(repWgt), inv: false },
        { label: "Projected GCI", sub: isRent ? "one-month fee" : "at close", m: r0(repGci), inv: false },
        { label: "Win Rate", sub: "won vs. lost · YTD", m: r0(`${winRate}%`), inv: false },
      ];
  const reportMeta = collPipe === "closed" ? "Closed · 2026 YTD · trend vs. same period last year" : `${collPipe === "all" ? "All pipelines" : PIPE_NAMES[collPipe] ?? ""} · ${openCount} open · trend vs. prior period`;

  const showClosedSec = collPipe === "all" || collPipe === "closed";
  const secPipes = collPipe === "all" ? [] : collPipe === "closed" ? [] : [collPipe];
  const viewDefs: Array<[string, string]> = collPipe === "all" ? [["List", "list"], ["Week", "week"]] : [["Board", "board"], ["List", "list"], ["Week", "week"]];

  const allDeals = columns.flatMap((c) => c.cards.map((cc) => ({ ...cc, stage: c.stage }))).sort(CMP[sort]);
  const weekCols = [
    ...WEEK_DAYS.map(([label, date]) => ({ label, date, cards: allDeals.filter((c) => !["Won", "Lost", "Placed"].includes(c.stage!) && c.due === date) })),
    { label: "Later", date: "beyond Fri", cards: allDeals.filter((c) => !["Won", "Lost", "Placed"].includes(c.stage!) && !WEEK_DAYS.some((d) => d[1] === c.due)) },
  ];

  const colGci = (c: Column) => isRent ? "" : `$${c.cards.reduce((s, x) => s + x.weightedNum, 0).toFixed(1)}M`;
  const openCard = (c: Card) => setPeek(c);

  const decideRef = (d: "accepted" | "declined") => { setRefDecided(d); void recordAction({ actor: "user", skill: "compliance", action: `Partner referral ${d} — ${PIPE_REF.name} (§3.3 timestamp priority)` }, "referral/rosen", () => setRefDecided(null)); };

  /* Drag a board card to another stage — human action, audited + reversible. */
  const moveCard = (card: { id?: string; name: string }, from: string, to: string) => {
    if (from === to) return;
    const key = card.id ?? card.name;
    const prev = stageOv[key];
    setStageOv((s) => ({ ...s, [key]: to }));
    const opp = card.id ? opportunities.find((o) => o.id === card.id) : undefined;
    if (opp) {
      // Real deal: persist the stage to the DB (audited + undoable via save).
      void save<Opportunity>("opportunities", { ...opp, stage: to }, { actor: "user", skill: "chief_of_staff", action: `Opportunity moved — ${card.name} · ${from} → ${to}` });
    } else {
      void recordAction(
        { actor: "user", skill: "chief_of_staff", action: `Opportunity moved — ${card.name} · ${from} → ${to}` },
        `opp/${card.name}`,
        () => setStageOv((s) => { const n = { ...s }; if (prev === undefined) delete n[key]; else n[key] = prev; return n; }),
      );
    }
  };
  const onDropStage = (to: string) => { if (dragCard) moveCard(dragCard, dragCard.from, to); setDragCard(null); setDragOverStage(null); };
  const openDeal = (c: Card, stage: string) => navigate(`/deal/${encodeURIComponent(c.name)}`, { state: { deal: { name: c.name, stage, status: c.status, budget: c.budget, prob: c.prob, opp: c.opp } } });

  /* New Deal — create a real Opportunity from a contact (persisted + audited).
     The status field arms the cadence + next action (like a contact's classification). */
  const PIPE_KEYS = ["purchases", "listings", "rentals", "investments", "offmarket"] as const;
  const [newDeal, setNewDeal] = useState<null | { name: string; contactId: string; contactQuery: string; pipeline: string; status: string; budget: string; probability: string; lostReason: string }>(null);
  const openNewDeal = () => setNewDeal({ name: "", contactId: "", contactQuery: "", pipeline: "purchases", status: "Prospecting", budget: "", probability: "30", lostReason: "" });
  const dueFromCadence = (cadence: string): string => {
    const c = cadence.toLowerCase();
    const wk = /(\d+)\s*week/.exec(c), dy = /(\d+)\s*day/.exec(c);
    const days = wk ? +wk[1] * 7 : dy ? +dy[1] : /quarter/.test(c) ? 90 : /week/.test(c) ? 7 : /month/.test(c) ? 30 : 3;
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  };
  const createDeal = () => {
    if (!newDeal || !newDeal.contactId) return;
    const contact = contacts.find((c) => c.id === newDeal.contactId);
    const status = newDeal.status;
    const play = settingsRows[0]?.status_cadence?.[status] ?? { cadence: DEAL_PLAY[status]?.cadence ?? "Weekly", action: DEAL_PLAY[status]?.next };
    const nextAction = DEAL_PLAY[status]?.next ?? play.action ?? "Set the next step";
    const opp: Opportunity = {
      id: newId("opp"), contact_id: newDeal.contactId, pipeline: newDeal.pipeline as Pipeline, stage: status,
      budget: newDeal.budget.trim() ? fmtBudget(newDeal.budget.trim()) : "$0", probability: Number(newDeal.probability) || 0,
      flow_stage: dealTypeOf(newDeal.pipeline).flow[0],
      heat: status === "Hot" || status === "Won" ? "HOT" : "WARM",
      next_action: nextAction, next_due: dueFromCadence(play.cadence),
      lost_reason: status === "Lost" ? (newDeal.lostReason || "Unspecified") : undefined,
      name: newDeal.name.trim() || undefined, contact_name: contact?.name, source: "Manual",
    };
    void save<Opportunity>("opportunities", opp, { actor: "user", skill: "chief_of_staff", action: `Opportunity created — ${opp.name ?? contact?.name ?? "deal"} · ${PIPE_NAMES[newDeal.pipeline] ?? newDeal.pipeline} · ${status} · cadence ${play.cadence}` });
    setNewDeal(null);
  };

  const p = peek ? buildPeek(peek) : null;

  return (
    <div style={{ padding: "0 48px 140px" }}>
      {/* REPORT BAR */}
      <div style={{ margin: "26px 0 26px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D" }}>Opportunities report</span>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{reportMeta}</span>
        </div>
        <div style={{ display: "grid", overflowX: "auto", gridTemplateColumns: "repeat(5,minmax(170px,1fr))", gap: 12 }}>
          {reports.map((r) => (
            <div key={r.label} className="op-card" style={{ borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", whiteSpace: "nowrap" }}>{r.label}</div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 28, lineHeight: 1, marginTop: 12, color: "#0D0D0D" }}>{r.m.v}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.01em", color: "#B8B8B8", marginTop: 5 }}>{r.sub}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 14, borderTop: "1px solid #E3E3E3", paddingTop: 12 }}>
                {[deltaCell("30 D", r.m.d30, r.inv), deltaCell("QTR", r.m.dQ, r.inv), deltaCell("1 YR", r.m.dY, r.inv)].map((d) => (
                  <div key={d.period} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B8B8B8" }}>{d.period}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, color: d.color }}>{d.disp}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER ROW */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "rgba(255,255,255,0.55)", border: "1px solid #E3E3E3", padding: "16px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: "14px 26px", flexWrap: "wrap" }}>
          {COLL_PIPES.map(([label, id]) => (
            <div key={id} onClick={() => setCollPipe(id)} style={{ fontFamily: SANS, fontWeight: collPipe === id ? 600 : 400, fontSize: 13, letterSpacing: "0.02em", color: collPipe === id ? "#0D0D0D" : "#8F8F8F", paddingBottom: 5, borderBottom: `1.5px solid ${collPipe === id ? "#0D0D0D" : "transparent"}`, cursor: "pointer", transition: "color 150ms" }}>{label}</div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={openNewDeal} className="op-btn-solid" style={{ background: "#0D0D0D", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#FFFFFF", cursor: "pointer", transition: "opacity 150ms" }}>+ New Deal</button>
          {collPipe !== "closed" && (
            <div style={{ display: "flex", gap: 18 }}>
              {viewDefs.map(([label, id]) => (
                <div key={id} onClick={() => setViewSel(id as "board" | "list" | "week")} style={{ fontFamily: SANS, fontWeight: view === id ? 600 : 400, fontSize: 12.5, letterSpacing: "0.02em", color: view === id ? "#0D0D0D" : "#8F8F8F", paddingBottom: 5, borderBottom: `1.5px solid ${view === id ? "#0D0D0D" : "transparent"}`, cursor: "pointer", transition: "color 150ms" }}>{label}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NEW DEAL MODAL */}
      {newDeal && (
        <>
          <div onClick={() => setNewDeal(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(13,13,13,0.34)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 91, width: 460, maxWidth: "92vw", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(26px) saturate(1.8)", WebkitBackdropFilter: "blur(26px) saturate(1.8)", border: "1px solid rgba(255,255,255,0.75)", borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.22)", padding: "24px 26px" }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>New deal</div>
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F", marginTop: 4, marginBottom: 18 }}>Create an opportunity from a contact — it appears on the board and feeds your reports.</div>
            {contacts.length === 0 ? (
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", padding: "8px 0 18px" }}>Add or import a contact first — a deal belongs to a contact.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Searchable contact picker — a native <select> is unusable with thousands of contacts. */}
                <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 14, alignItems: "start" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, color: "#5D5D5D", paddingTop: 9 }}>Contact</span>
                  <div style={{ position: "relative" }}>
                    <input value={newDeal.contactQuery} onChange={(e) => setNewDeal({ ...newDeal, contactQuery: e.target.value, contactId: "" })} placeholder="Search a contact by name…" className="op-field" />
                    {newDeal.contactQuery.trim() && !newDeal.contactId && (() => {
                      const q = newDeal.contactQuery.trim().toLowerCase();
                      const matches = contacts.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 12);
                      return (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 5, marginTop: 4, background: "#FFFFFF", border: "1px solid #D9D9D9", borderRadius: 8, maxHeight: 220, overflowY: "auto", boxShadow: "0 10px 28px rgba(0,0,0,0.14)" }}>
                          {matches.map((c) => (
                            <div key={c.id} onClick={() => setNewDeal({ ...newDeal, contactId: c.id, contactQuery: c.name })} className="op-menu-item" style={{ padding: "9px 12px", cursor: "pointer", fontFamily: SANS, fontSize: 13, color: "#0D0D0D" }}>{c.name}</div>
                          ))}
                          {matches.length === 0 && <div style={{ padding: "9px 12px", fontFamily: SANS, fontSize: 12.5, color: "#8F8F8F" }}>No contact matches “{newDeal.contactQuery}”.</div>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {([
                  ["Deal name (optional)", <input key="n" value={newDeal.name} onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })} placeholder="e.g. Continuum South 3902" className="op-field" />],
                  ["Pipeline", <select key="p" value={newDeal.pipeline} onChange={(e) => setNewDeal({ ...newDeal, pipeline: e.target.value })} className="op-field">{PIPE_KEYS.map((pk) => <option key={pk} value={pk}>{PIPE_NAMES[pk]}</option>)}</select>],
                  ["Status", <select key="s" value={newDeal.status} onChange={(e) => setNewDeal({ ...newDeal, status: e.target.value })} className="op-field">{DEAL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>],
                  ...(newDeal.status === "Lost" ? [["Lost reason", <select key="lr" value={newDeal.lostReason} onChange={(e) => setNewDeal({ ...newDeal, lostReason: e.target.value })} className="op-field"><option value="">Select a reason…</option>{lossReasons.map((r) => <option key={r} value={r}>{r}</option>)}</select>] as [string, ReactNode]] : []),
                  ["Budget", <input key="b" value={newDeal.budget} onChange={(e) => setNewDeal({ ...newDeal, budget: e.target.value })} placeholder="$6.8M" className="op-field" />],
                  ["Probability %", <input key="pr" value={newDeal.probability} onChange={(e) => setNewDeal({ ...newDeal, probability: e.target.value.replace(/[^0-9]/g, "") })} placeholder="30" className="op-field" />],
                ] as Array<[string, ReactNode]>).map(([label, field]) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 14, alignItems: "center" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, color: "#5D5D5D" }}>{label}</span>
                    {field}
                  </div>
                ))}
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, lineHeight: 1.5, color: "#8F8F8F", paddingLeft: 164 }}>
                  Arms cadence <span style={{ color: "#0D0D0D", fontWeight: 500 }}>{DEAL_PLAY[newDeal.status]?.cadence}</span> · next: {DEAL_PLAY[newDeal.status]?.next}
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 22 }}>
              <button onClick={() => setNewDeal(null)} style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Cancel</button>
              <button onClick={createDeal} disabled={!newDeal.contactId} style={{ background: newDeal.contactId ? "#0D0D0D" : "#B8B8B8", border: "none", borderRadius: 999, padding: "8px 18px", fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#FFFFFF", cursor: newDeal.contactId ? "pointer" : "default" }}>Create deal</button>
            </div>
          </div>
        </>
      )}

      {/* BOARD */}
      {view === "board" && collPipe !== "closed" && (
        <>
          {refDecided === null ? (
            <div className="op-refbanner" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderRadius: 12, borderLeft: "2px solid #B45309", padding: "14px 18px", marginBottom: 22 }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: "#B45309" }} />
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}><span style={{ fontWeight: 600 }}>Partner referral — {PIPE_REF.name}</span> · by {PIPE_REF.by} · {PIPE_REF.reg}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 3 }}>{PIPE_REF.want} · timestamp priority §3.3 · decline window 5 business days §9</div>
              </div>
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                <button onClick={() => decideRef("accepted")} className="op-btn-solid" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Accept — protection starts</button>
                <button onClick={() => decideRef("declined")} className="op-btn-decline" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "8px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#D0342C", cursor: "pointer" }}>Decline — in book</button>
              </div>
            </div>
          ) : (
            <div className="op-refbanner" style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: 12, borderLeft: "2px solid #B45309", padding: "14px 18px", marginBottom: 22 }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: "#B45309" }} />
              <div style={{ flex: 1 }}><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}><span style={{ fontWeight: 600 }}>Partner referral — {PIPE_REF.name}</span></div></div>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11, color: refDecided === "accepted" ? "#10A37F" : "#D0342C" }}>{refDecided === "accepted" ? "Accepted ✓ · protection to Jul 07, 2027 · partner auto-updates ON" : "Declined — partner notified with reason (§9)"}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 38 }}>
            {secPipes.map((pid) => {
              const cols = columns; // specific pipeline → columns already scoped
              const openN = cols.filter((c) => c.stage !== "Won" && c.stage !== "Lost").reduce((s, c) => s + c.cards.length, 0);
              const val = cols.flatMap((c) => c.cards).reduce((s, c) => s + c.budgetNum, 0);
              const meta = `${openN} open · ${isRent ? `$${Math.round(val)}K/mo` : `$${val.toFixed(1)}M`}`;
              return (
                <div key={pid}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, paddingBottom: 11, borderBottom: "1px solid #0D0D0D", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>{PIPE_NAMES[pid]}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{meta}</span>
                    </div>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B8B8B8" }}>{pid === "offmarket" ? "" : "Pipeline → stages"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
                    {cols.map((cx) => {
                      const dropActive = !!dragCard && dragOverStage === cx.stage && dragCard.from !== cx.stage;
                      return (
                      <div
                        key={cx.stage}
                        onDragOver={(e) => { if (dragCard) { e.preventDefault(); if (dragOverStage !== cx.stage) setDragOverStage(cx.stage); } }}
                        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage((s) => (s === cx.stage ? null : s)); }}
                        onDrop={(e) => { e.preventDefault(); onDropStage(cx.stage); }}
                        style={{ width: 250, flex: "none", borderRadius: 12, outline: dropActive ? "1.5px dashed #10A37F" : "1.5px dashed transparent", outlineOffset: 4, background: dropActive ? "rgba(16,163,127,0.05)" : "transparent", transition: "background 120ms" }}
                      >
                        <div style={{ paddingBottom: 12, borderBottom: "1px solid #E3E3E3", marginBottom: 14 }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D" }}>{cx.stage}</div>
                            <span title="Review this stage's playbook" className="op-playbook" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B8B8B8", cursor: "pointer", border: "1px solid #E3E3E3", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap", transition: "all 150ms" }}>Playbook</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", whiteSpace: "nowrap" }}>{cx.cards.length} opps</span>
                            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D" }}>{colGci(cx)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {cx.cards.map((c) => (
                            <div
                              key={c.name}
                              draggable
                              onDragStart={(e) => { setDragCard({ id: c.id, name: c.name, from: cx.stage }); e.dataTransfer.effectAllowed = "move"; }}
                              onDragEnd={() => { setDragCard(null); setDragOverStage(null); }}
                              onClick={() => openCard({ ...c, stage: cx.stage })}
                              className="op-dealcard"
                              style={{ borderRadius: 12, padding: "15px 15px 13px", cursor: "grab", transition: "background 150ms", opacity: dragCard?.name === c.name ? 0.5 : 1 }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                                <span onClick={(e) => { e.stopPropagation(); openDeal(c, cx.stage); }} title="Open deal record" className="op-dealname" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", cursor: "pointer" }}>{c.name}</span>
                                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", flex: "none" }}>{fmtBudget(c.budget)}</span>
                              </div>
                              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", marginTop: 4 }}>{c.opp}</div>
                              {(c.tags?.length ?? 0) > 0 && (
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 9 }}>
                                  {c.tags!.slice(0, 3).map((tg) => <span key={tg} style={{ border: "1px solid #E3E3E3", borderRadius: 999, padding: "1px 8px", fontFamily: SANS, fontSize: 9.5, color: "#5D5D5D", background: "rgba(249,249,249,0.55)" }}>{tg}</span>)}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flex: "none" }} />
                                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{c.status} · {c.prob}</span>
                              </div>
                              <div style={{ height: 0.5, background: "#E3E3E3", margin: "12px 0 10px" }} />
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D", lineHeight: 1.35 }}>{c.next}</span>
                                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: c.dueColor, flex: "none" }}>{c.due}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* LIST */}
      {view === "list" && collPipe !== "closed" && (
        <div style={{ borderTop: "1px solid #E3E3E3", overflowX: "auto" }}>
          <div style={{ display: "grid", minWidth: 920, gridTemplateColumns: "1.5fr 0.8fr 1.2fr 1fr 0.7fr 0.55fr 1.5fr 0.7fr", padding: "13px 4px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)", alignItems: "center" }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search deals" className="op-search" style={{ width: "85%", background: "transparent", border: "none", borderBottom: "1px solid #C9C9C9", padding: "2px 0", fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#0D0D0D", outline: "none" }} />
            {["Pipeline", "Opportunity", "Stage", "Budget", "Prob", "Next Action", "Due"].map((h) => (
              <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>
            ))}
          </div>
          {allDeals.map((c) => (
            <div key={c.name} onClick={() => openCard(c)} className="op-listrow" style={{ display: "grid", minWidth: 920, gridTemplateColumns: "1.5fr 0.8fr 1.2fr 1fr 0.7fr 0.55fr 1.5fr 0.7fr", padding: "16px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "center", cursor: "pointer", transition: "background 150ms" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flex: "none" }} />
                <span onClick={(e) => { e.stopPropagation(); openDeal(c, c.stage ?? ""); }} title="Open deal record" className="op-dealname" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", cursor: "pointer" }}>{c.name}</span>
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, letterSpacing: "0.02em", color: "#0D0D0D" }}>{c.pipeName}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{c.opp}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{c.stage}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{fmtBudget(c.budget)}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{c.prob}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{c.next}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: c.dueColor }}>{c.due}</div>
            </div>
          ))}
        </div>
      )}

      {/* WEEK */}
      {view === "week" && collPipe !== "closed" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, alignItems: "start" }}>
          {weekCols.map((w) => (
            <div key={w.label}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, paddingBottom: 10, borderBottom: "1px solid #0D0D0D", marginBottom: 12 }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>{w.label} <span style={{ fontWeight: 400, color: "#8F8F8F" }}>{w.date}</span></span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>{w.cards.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {w.cards.map((c) => (
                  <div key={c.name} onClick={() => openCard(c)} className="op-dealcard" style={{ borderRadius: 10, padding: "11px 12px", cursor: "pointer", transition: "background 150ms" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, color: "#0D0D0D", lineHeight: 1.35 }}>{c.name}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#5D5D5D", lineHeight: 1.45, marginTop: 4 }}>{c.next}</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#0D0D0D" }}>{fmtBudget(c.budget)}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.04em", color: c.dueColor }}>{c.due}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CLOSED */}
      {showClosedSec && (
        <div style={{ marginTop: 38 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, paddingBottom: 11, borderBottom: "1px solid #0D0D0D", marginBottom: 2 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>Closed</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>2026 YTD · {wonRows.length} won · {wonGciLabel} GCI realized · {lostRows.length} lost</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {([["Won", "won"], ["Lost", "lost"]] as const).map(([label, id]) => {
                const active = closedSeg === id;
                return <div key={id} onClick={() => setClosedSeg(id)} style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "5px 13px", fontFamily: SANS, fontWeight: active ? 500 : 400, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", transition: "all 150ms", background: active ? "#E9E8E4" : "transparent", color: active ? "#0D0D0D" : "#8F8F8F", border: `1px solid ${active ? "#0D0D0D" : "#E3E3E3"}` }}>{label}</div>;
              })}
            </div>
          </div>
          {closedSeg === "won" ? (
            <>
              <div style={{ borderTop: "1px solid #E3E3E3" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 0.8fr 0.8fr 0.8fr 1.4fr", padding: "13px 4px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                  {CLOSED_HEAD.map((h) => <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>)}
                </div>
                {wonRows.map((r) => (
                  <div key={r.name} className="op-listrow" style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 0.8fr 0.8fr 0.8fr 1.4fr", padding: "16px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "center", transition: "background 150ms" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{r.name}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.asset}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.closed}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{r.volume}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{r.gci}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: r.postColor }}>{r.post}</div>
                  </div>
                ))}
                {wonRows.length === 0 && <div style={{ padding: "34px 4px", textAlign: "center", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F" }}>No won deals yet — move a deal to “Won” on the board.</div>}
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.6, color: "#8F8F8F", marginTop: 16 }}>Closed relationships feed referral mining · anniversary gestures · cross-sell radar. Post-sale cadence: quarterly.</div>
            </>
          ) : (
            <>
              <div style={{ borderTop: "1px solid #E3E3E3" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.7fr 0.7fr 1.8fr", padding: "13px 4px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                  {["Deal", "Pipeline", "Value", "Lost", "Reason · last note"].map((h) => <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>)}
                </div>
                {lostRows.map((r) => (
                  <div key={r.name} className="op-listrow" style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.7fr 0.7fr 1.8fr", padding: "16px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "center", transition: "background 150ms" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{r.name}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, letterSpacing: "0.02em", color: "#0D0D0D" }}>{r.pipe}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.budget}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.when}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.reason}</div>
                  </div>
                ))}
                {lostRows.length === 0 && <div style={{ padding: "34px 4px", textAlign: "center", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F" }}>No lost deals — nothing here yet.</div>}
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.6, color: "#8F8F8F", marginTop: 16 }}>Lost deals move to quarterly nurture — the agent tags loss reasons and watches for re-entry signals.</div>
            </>
          )}
        </div>
      )}

      {/* PEEK DRAWER */}
      {p && (
        <>
          <div onClick={() => setPeek(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 80 }} />
          <div className="op-peek">
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid #E3E3E3" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8F8F8F" }}>{p.stage} · {p.side}</span>
                <span onClick={() => setPeek(null)} className="op-peek-x" style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E3E3E3", borderRadius: 8, fontFamily: SANS, fontSize: 13, color: "#8F8F8F", cursor: "pointer", transition: "all 150ms" }}>×</span>
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 22, letterSpacing: "-0.01em", color: "#0D0D0D", marginTop: 8 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.dot }} />
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}>{p.status} · {p.probLabel}</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #E3E3E3" }}>
                {[{ l: "Budget", v: p.budget }, { l: "Est. GCI", v: p.gci }, { l: "Weighted GCI", v: p.wGci }].map((n, i) => (
                  <div key={n.l} style={{ padding: i === 0 ? "16px 0 16px 28px" : "16px 0 16px 20px", borderRight: i < 2 ? "1px solid #E3E3E3" : "none" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>{n.l}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 19, color: "#0D0D0D", marginTop: 5 }}>{n.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "18px 28px", borderBottom: "1px solid #E3E3E3" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Due dates</div>
                {p.dues.map((d) => (
                  <div key={d.l} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{d.l}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, color: d.dColor, whiteSpace: "nowrap" }}>{d.d}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "18px 28px", borderBottom: "1px solid #E3E3E3" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Property</div>
                <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>{p.address}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#5D5D5D", marginTop: 5 }}>{p.specs}</div>
                <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{p.ppsf}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{p.delivery}</span>
                </div>
              </div>
              <div style={{ padding: "18px 28px", borderBottom: "1px solid #E3E3E3" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Related contacts</div>
                {p.contacts.map((c) => (
                  <div key={c.n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <span className="op-avatar" style={{ width: 28, height: 28, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.05em", color: "#5D5D5D" }}>{c.initials}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{c.n}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 1 }}>{c.r}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "18px 28px 24px" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Activity log</div>
                {p.acts.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "7px 0" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", flex: "none", width: 44 }}>{a.d}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: "#303030" }}>{a.t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "16px 28px", borderTop: "1px solid #E3E3E3", background: "rgba(255,255,255,0.62)" }}>
              <button onClick={() => { const nm = peek!.name; setPeek(null); navigate(`/deal/${encodeURIComponent(nm)}`, { state: { deal: { name: nm, stage: peek!.stage, status: peek!.status, budget: peek!.budget, prob: peek!.prob, opp: peek!.opp } } }); }} className="op-btn-solid" style={{ flex: 1, background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "11px 0", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Open full record</button>
              <button onClick={() => { setPeek(null); navigate("/activities"); }} className="op-btn-outline" style={{ flex: 1, background: "transparent", border: "1px solid #E3E3E3", padding: "11px 0", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Log activity</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
