import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getAuditLog, recordAction } from "../../data/repository";
import type { AuditEntry } from "../../domain/types";
import { useAgentItems } from "../../agent/useAgentItems";
import { resolveAgentItem } from "../../agent/resolve";
import { SKILL_LABELS } from "../../domain/agent";
import { SANS } from "../contacts/data";
import { useNavigate } from "react-router-dom";
import {
  AGENT_LEDGER, DELTAS, fmtK, FORECAST, HEALTH_FACTORS, HEALTH_SCORE, HERO_SUB,
  LEARNED, MONEY_STRIP, MORNING_BRIEF, NA_PROPOSALS, NA_SEQUENCES, PLAYS, PROPOSALS,
  RISK_ROWS, TOUCH_TODAY, WEEKLY_MOVEMENT,
} from "./data";
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

export function Intelligence() {
  const navigate = useNavigate();
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [sec, setSec] = useState({ act: true, touch: true, next: true, learned: true, risk: true, plays: false, perf: false, agent: false });
  const toggle = (k: keyof typeof sec) => setSec((s) => ({ ...s, [k]: !s[k] }));
  const [naDone, setNaDone] = useState<Record<string, "accepted" | "dismissed">>({});
  const [lnDone, setLnDone] = useState<Record<string, boolean>>({});
  const naOpen = NA_PROPOSALS.filter((p) => !naDone[p.id]);
  const lnOpen = LEARNED.filter((l) => !lnDone[l.id]);
  const acceptNa = (id: string, label: string) => { setNaDone((d) => ({ ...d, [id]: "accepted" })); void recordAction({ actor: "user", skill: "chief_of_staff", action: `Follow-up accepted — ${label}` }, `na/${id}`, () => setNaDone((d) => { const n = { ...d }; delete n[id]; return n; })); void getAuditLog().then(setAudit); };
  const dismissNa = (id: string) => setNaDone((d) => ({ ...d, [id]: "dismissed" }));
  const saveLn = (id: string, audit: string) => { setLnDone((d) => ({ ...d, [id]: true })); void recordAction({ actor: "user", skill: "transaction_coordinator", action: audit }, `learned/${id}`, () => setLnDone((d) => { const n = { ...d }; delete n[id]; return n; })); void getAuditLog().then(setAudit); };

  const [decided, setDecided] = useState<Record<string, "approved" | "dismissed" | "snoozed">>({});
  const [selMonth, setSelMonth] = useState("SEP");
  const [whatIf, setWhatIf] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  useEffect(() => { void getAuditLog().then(setAudit); }, []);

  /* the mock agent's items routed to Needs Your Decision (§12) flow through
     this same queue — the compliance block etc. appear alongside the seeds. */
  const { items: agentItems } = useAgentItems();
  const agentDecisions = agentItems.filter((i) => i.needsDecision && decided[i.id] !== "snoozed");

  const proposals = PROPOSALS.filter((p) => decided[p.id] !== "snoozed");
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
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{MORNING_BRIEF}</span>
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
              <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 44, lineHeight: 1, color: "#0D0D0D" }}>{HEALTH_SCORE}</span>
              <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 16, color: "#8F8F8F" }}>/100</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginTop: 20 }}>
              {HEALTH_FACTORS.map((f) => (
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
          {MONEY_STRIP.map((m) => (
            <div key={m.label} style={{ padding: "26px 22px 24px", borderRight: "1px solid #E3E3E3" }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{m.label}</div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 30, lineHeight: 1, marginTop: 16, color: "#0D0D0D" }}>{m.value}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D", marginTop: 12 }}>{m.sub}</div>
            </div>
          ))}
        </div>
        {metricsOpen && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", borderTop: "1px solid #F0F0F0", padding: "16px 22px 18px" }}>
            {HERO_SUB.map((s) => (
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
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Needs Your Decision</span>
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
                <div key={p.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #ECECEC", borderLeft: "2px solid #D0342C", background: "rgba(255,255,255,0.45)", padding: "16px 22px" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{p.label}</div>
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
                <div key={it.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #ECECEC", borderLeft: "2px solid #D0342C", background: "rgba(255,255,255,0.45)", padding: "16px 22px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{SKILL_LABELS[it.skill]} · {it.title}</span>
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
      <Block dot="#D0342C" title="Touch Today · Communications" badge={String(TOUCH_TODAY.length)} hint="agent read the context, planned and drafted — review → approve → it sends" open={sec.touch} onToggle={() => toggle("touch")}>
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
      </Block>

      {/* NEXT ACTIONS */}
      <Block dot="#0D0D0D" title="Next Actions" badge={naOpen.length > 0 ? String(naOpen.length) : undefined} hint="the agent proposes the follow-ups — you accept, it schedules & chases" open={sec.next} onToggle={() => toggle("next")}>
        <div style={{ padding: "8px 22px 20px" }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", margin: "8px 0 6px" }}>Proposed follow-ups</div>
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
      <Block dot="#D0342C" title="Risk Radar" badge={String(RISK_ROWS.length)} hint="what the agent is watching" open={sec.risk} onToggle={() => toggle("risk")}>
        <div style={{ padding: "20px 22px 24px" }}>
          {RISK_ROWS.map((r) => (
            <div key={r.lead} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "13px 0", borderBottom: "1px solid #ECECEC" }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: "#E0655C", position: "relative", top: 4 }} />
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>{r.lead}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", marginTop: 3 }}>{r.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* OPPORTUNITY PLAYS */}
      <Block title="Opportunity Plays" badge={String(PLAYS.length)} hint="where the agent sees upside" open={sec.plays} onToggle={() => toggle("plays")}>
        <div style={{ padding: "20px 22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {PLAYS.map((p) => (
            <div key={p.idx} style={{ display: "flex", gap: 14 }}>
              <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 12, letterSpacing: "0.1em", color: "#B8B8B8", flex: "none", paddingTop: 2 }}>{p.idx}</span>
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>{p.title}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.6, color: "#303030", marginTop: 5 }}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* PERFORMANCE */}
      <Block title="Performance" hint="forecast · movement · activity" open={sec.perf} onToggle={() => toggle("perf")}>
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
      </Block>

      {/* AGENT ACTIVITY */}
      <Block title="Agent Activity" badge={String(AGENT_LEDGER.length)} hint="overnight ledger · learning loop · auditable" open={sec.agent} onToggle={() => toggle("agent")}>
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
      </Block>
    </div>
  );
}
