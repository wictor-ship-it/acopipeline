import { useState, type ReactNode } from "react";
import content from "../../data/seed/content.json";
import type { Draft } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import { recordAction } from "../../data/repository";
import { agentService } from "../../agent/MockAgentService";
import { performance as perf, network as net, learningLoop } from "./blocks";
import "./Intelligence.css";

const I = content.intelligence;

/** Collapsible block — the defining interaction model of the Intelligence
 *  cockpit (v5): title + count badge + summary line + chevron. */
function Block({
  title,
  count,
  summary,
  hint,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  summary?: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="in-block">
      <button className="in-block-head" onClick={() => setOpen((o) => !o)}>
        <span className="in-block-title">{title}</span>
        {count != null && <span className="in-block-count">{count}</span>}
        {hint && <span className="in-block-hint">{hint}</span>}
        <span className="in-block-spacer" />
        {!open && summary && <span className="in-block-summary">{summary}</span>}
        <span className="in-block-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="in-block-body">{children}</div>}
    </section>
  );
}

export function Intelligence() {
  const { items: drafts } = useCollection<Draft>("drafts");
  const pending = drafts.filter((d) => d.status === "pending");

  return (
    <div className="in-wrap">
      {/* Morning brief */}
      <section className="in-section">
        <div className="in-card in-brief">
          <div className="in-brief-title">{I.morningBrief.title}</div>
          <div className="in-brief-line">{I.morningBrief.line}</div>
          <div className="in-brief-hint">{I.morningBrief.hint}</div>
        </div>
      </section>

      {/* Pipeline health + expandable secondary metrics */}
      <PipelineHealth />

      <Block title="Needs your decision" count={I.needsYourDecision.length} summary="3 decisions waiting">
        <NeedsDecision />
      </Block>

      <Block title={I.touchToday.header} count={pending.length} hint={I.touchToday.headerHint} summary={`${pending.length} drafts staged`}>
        <TouchToday drafts={pending} />
        <div className="in-bulk" style={{ marginTop: 12 }}>
          <span className="in-bulk-note">{I.touchToday.footer}</span>
        </div>
      </Block>

      <Block title="Next actions" count={I.nextActions.tasks.length} summary={`${I.nextActions.tasks.filter((t) => t.bucket === "overdue").length} overdue · ${I.nextActions.tasks.length} open`}>
        <NextActions />
      </Block>

      <Block title="Agent learned" count={I.agentLearned.length} summary="4 fields learned overnight">
        <LearnedFields />
      </Block>

      <Block title="Risk radar" count={I.riskRadar.items.length} hint={I.riskRadar.thresholdsNote} summary="1 SLA breach · 1 deadline">
        <div className="in-queue">
          {I.riskRadar.items.map((r) => (
            <div className="in-risk" key={r.id} style={{ borderLeftColor: r.sev }}>
              <div className="in-risk-head">
                <span className="in-risk-lead">{r.lead}</span>
                <span className="in-risk-tag" style={{ color: r.sev }}>{r.tag}</span>
                <span className="in-risk-clock">{r.clock}</span>
                <span className="in-risk-gci">{r.gci}</span>
              </div>
              <div className="in-risk-note">{r.note}</div>
              <div className="in-risk-remedy">{r.remedy}</div>
              <div className="in-actions">
                <button className="in-btn in-btn-primary">{r.act}</button>
                <button className="in-btn in-btn-ghost">Snooze 7d</button>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Opportunity plays" count={I.opportunityPlays.length} summary="3 plays proposed">
        <div className="in-cards-grid">
          {I.opportunityPlays.map((p) => (
            <div className="in-card in-play" key={p.title}>
              <div className="in-play-title">{p.title}</div>
              <div className="in-play-body">{p.body}</div>
              <div className="in-actions" style={{ marginTop: 10 }}>
                <button className="in-btn in-btn-ghost">Open brief</button>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Money in motion" count={I.moneyInMotion.rows.length} summary="3 closings next 30 days">
        <div className="in-card" style={{ overflow: "hidden" }}>
          <table className="in-table">
            <thead><tr>{I.moneyInMotion.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {I.moneyInMotion.rows.map((r) => (
                <tr key={r.deal}>
                  <td className="ink">{r.deal}</td>
                  <td>{r.stage}</td>
                  <td>{r.close}</td>
                  <td className="ink">{r.wgci}</td>
                  <td>{r.blocker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      <Block title="Performance" hint="forecast · movement · activity" summary="SEP expected $4.4M · net +$310K this week" defaultOpen={false}>
        <PerformanceBlock />
      </Block>

      <Block title="Network — Vendors &amp; Partners" hint={net.hint} summary="5 vendors tracked · 2 balances to settle · 1 cadence due" defaultOpen={false}>
        <NetworkBlock />
      </Block>

      <Block title="Agent activity" hint="overnight ledger · learning loop · auditable" count={I.agentLedgerOvernight.length} defaultOpen={false} summary="11 overnight actions · 2 learnings · Oct–Nov cash valley">
        <div className="in-card" style={{ padding: "8px 20px 12px", marginBottom: 18 }}>
          {I.agentLedgerOvernight.map((l, i) => (
            <div className="in-ledger-row" key={i}>
              <span className="in-ledger-time">{l.time}</span>
              <span className="in-ledger-tag">{l.tag}</span>
              <span className="in-ledger-text">{l.text}</span>
            </div>
          ))}
        </div>
        <LearningLoop />
      </Block>

      <div className="in-endbrief">End of brief — everything else today is executed and logged by the agent. Nothing sent without your approval.</div>
    </div>
  );
}

function PipelineHealth() {
  const [more, setMore] = useState(false);
  const P = I.pipelineHealth;
  return (
    <Block title="Pipeline health" summary={`${P.score}/100 · ${P.trend}`}>
      <div className="in-card in-health">
        <div className="in-health-top">
          <span className="in-health-score">{P.score}<span className="in-health-denom">/100</span></span>
          <span className="in-health-trend">{P.trend}</span>
          <span className="in-block-spacer" />
          <button className="in-btn in-btn-ghost" onClick={() => setMore((m) => !m)}>{more ? "Fewer metrics" : "More metrics"}</button>
        </div>
        <div className="in-factors">
          {P.factors.map((f) => (
            <div className="in-factor" key={f.label}>
              <div className="fl"><span className="fk">{f.label}</span><span className="fv">{f.value}</span></div>
              <div className="in-bar"><span style={{ width: f.w }} /></div>
            </div>
          ))}
        </div>
        <div className="in-money-strip">
          {P.moneyStrip.map((m) => (
            <div className="in-money" key={m.label}>
              <div className="ml">{m.label}</div>
              <div className="mv">{m.value}</div>
              <div className="ms">{m.sub}</div>
            </div>
          ))}
        </div>
        {more && (
          <div className="in-secondary">
            {content.welcome.heroSubStats.map((s) => (
              <div className="in-secondary-metric" key={s.label}>
                <div className="ml">{s.label}</div>
                <div className="mv">{s.value}</div>
                <div className="ms">{s.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Block>
  );
}

/** Touch Today queue with bulk approve (R5 — "bulk approve em filas"). */
function TouchToday({ drafts }: { drafts: Draft[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  async function approveMany(ids: string[]) {
    for (const id of ids) await agentService.resolve(id, "approved");
    setSelected(new Set());
  }

  if (drafts.length === 0) {
    return <div className="in-queue"><div className="in-item">All caught up — the queue is clear. The agent stages the next batch overnight.</div></div>;
  }

  return (
    <>
      <div className="in-bulkbar">
        <label className="in-bulk-select">
          <input
            type="checkbox"
            checked={selected.size === drafts.length}
            onChange={(e) => setSelected(e.target.checked ? new Set(drafts.map((d) => d.id)) : new Set())}
          />
          Select all
        </label>
        <div className="in-bulk-spacer" />
        <button className="in-btn in-btn-ghost" disabled={selected.size === 0} onClick={() => void approveMany([...selected])}>
          Approve selected · {selected.size}
        </button>
        <button className="in-btn in-btn-primary" onClick={() => void approveMany(drafts.map((d) => d.id))}>
          Approve all · {drafts.length}
        </button>
      </div>
      <div className="in-queue">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} selected={selected.has(d.id)} onToggle={() => toggle(d.id)} />
        ))}
      </div>
    </>
  );
}

function DraftCard({ draft, selected, onToggle }: { draft: Draft; selected: boolean; onToggle: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(draft.body);

  return (
    <div className="in-item agent">
      <div className="in-item-meta">
        <input type="checkbox" className="in-item-check" checked={selected} onChange={onToggle} />
        <span className="in-item-label">{draft.name_label} · {draft.value_label} · <span className="in-chan-tag">{draft.channel === "whatsapp" ? "WA" : draft.channel}</span> · {draft.language}</span>
      </div>
      <div className="in-item-body" style={{ fontSize: 13.5 }}>{draft.subject}</div>
      {draft.plan && <div className="in-item-plan">{draft.plan}</div>}
      {editing ? (
        <textarea className="in-edit" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      ) : (
        <div className="in-item-why" style={{ color: "var(--body)", fontStyle: "normal" }}>{draft.body}</div>
      )}
      <div className="in-actions">
        <button className="in-btn in-btn-primary" onClick={() => void agentService.resolve(draft.id, "approved")}>
          Approve &amp; send
        </button>
        {editing ? (
          <button className="in-btn in-btn-ghost" onClick={() => void agentService.resolve(draft.id, "edited", body)}>
            Save &amp; send
          </button>
        ) : (
          <button className="in-btn in-btn-ghost" onClick={() => setEditing(true)}>Edit</button>
        )}
        <button className="in-btn in-btn-ghost" onClick={() => void agentService.resolve(draft.id, "skipped")}>Skip</button>
      </div>
    </div>
  );
}

/** Next Actions sub-system (v5 BLOCK 01B): summary band, quick-add,
 *  agent-proposed follow-ups, agent-run sequences, and task rows with snooze. */
function NextActions() {
  const NA = I.nextActions;
  const [done, setDone] = useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState("");

  const overdue = NA.tasks.filter((t) => t.bucket === "overdue").length;
  const today = NA.tasks.filter((t) => t.bucket === "today").length;
  const week = NA.tasks.filter((t) => t.bucket === "week").length;
  const wgci = NA.tasks.reduce((s, t) => s + (t.wgci ? Number(t.wgci.replace(/[$K]/g, "")) : 0), 0);

  const BUCKETS = [
    { key: "overdue", label: "Overdue" },
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "later", label: "Later" },
  ];

  return (
    <>
      <div className="in-na-stats">
        {[["Overdue", overdue, "#D0342C"], ["Today", today, "#0D0D0D"], ["This week", week, "#0D0D0D"], ["Weighted GCI", `$${wgci}K`, "#0D0D0D"]].map(([l, v, c]) => (
          <div className="in-na-stat" key={l as string}>
            <div className="in-na-stat-label">{l}</div>
            <div className="in-na-stat-value" style={{ color: c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="in-na-quick">
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Add a task — “call Marcelo Friday, confirm the visit”…" onKeyDown={(e) => { if (e.key === "Enter") setQuick(""); }} />
        <span className="in-na-quick-hint">↵ create · or N T</span>
      </div>

      {NA.agentProposedFollowUps.filter((p) => !dismissed.has(p.id) && !accepted.has(p.id)).length > 0 && (
        <div className="in-na-group">
          <div className="in-na-group-label">Agent proposed follow-ups</div>
          {NA.agentProposedFollowUps.filter((p) => !dismissed.has(p.id) && !accepted.has(p.id)).map((p) => (
            <div className="in-na-prop" key={p.id}>
              <span className="in-na-prop-text">{p.text}</span>
              <button className="in-btn in-btn-primary" onClick={() => setAccepted((s) => new Set(s).add(p.id))}>Accept</button>
              <button className="in-btn in-btn-ghost" onClick={() => setDismissed((s) => new Set(s).add(p.id))}>Dismiss</button>
            </div>
          ))}
        </div>
      )}

      <div className="in-na-group">
        <div className="in-na-group-label">Sequences · agent-run</div>
        {NA.sequences.map((sq) => (
          <div className="in-na-seq" key={sq.id}>
            <div className="in-na-seq-top">
              <span className="in-na-seq-name">{sq.name}</span>
              <span className="in-na-seq-rule">{sq.rule}</span>
              <span className="in-block-spacer" />
              <button className="in-btn in-btn-ghost" onClick={() => setPaused((s) => { const n = new Set(s); n.has(sq.id) ? n.delete(sq.id) : n.add(sq.id); return n; })}>
                {paused.has(sq.id) ? "Resume" : "Pause"}
              </button>
            </div>
            <div className="in-na-seq-steps">
              {sq.steps.map((st, i) => (
                <span key={i} className={`in-na-step ${st.st}`}>
                  <span className="in-na-step-dot" />{st.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="in-na-group">
        <div className="in-na-group-label">Tasks</div>
        {BUCKETS.map((b) => {
          const rows = NA.tasks.filter((t) => t.bucket === b.key && !done.has(t.id));
          if (rows.length === 0) return null;
          return (
            <div key={b.key}>
              <div className="in-na-bucket">{b.label}</div>
              {rows.map((t) => (
                <div className="in-na-task" key={t.id}>
                  <input type="checkbox" className="in-item-check" onChange={() => setDone((s) => new Set(s).add(t.id))} />
                  <span className="in-na-task-type">{t.type}</span>
                  <div className="in-na-task-main">
                    <span className="in-na-task-name">{t.name}</span>
                    <span className="in-na-task-action">{t.action}</span>
                  </div>
                  {t.wgci && <span className="in-na-task-wgci">{t.wgci}</span>}
                  <span className="in-na-task-due" style={{ color: b.key === "overdue" ? "#D0342C" : "#8F8F8F" }}>{snoozed[t.id] ?? t.due}</span>
                  <span className="in-na-snooze">
                    {["+1d", "+3d", "+1w"].map((s) => (
                      <button key={s} className="in-na-snooze-btn" onClick={() => setSnoozed((m) => ({ ...m, [t.id]: s }))}>{s}</button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

function PerformanceBlock() {
  const [sel, setSel] = useState(perf.gciForecast.expected.month);
  const F = perf.gciForecast;
  const max = Math.max(...F.months.map((m) => m.raw));
  const selMonth = F.months.find((m) => m.month === sel) ?? F.months[2];
  const selRows = sel === F.expected.month ? F.expected.rows : [];
  return (
    <div className="in-perf">
      <div className="in-perf-head"><span className="in-sub-label">{F.label}</span><span className="in-perf-scale">{F.scale}</span></div>
      <div className="in-forecast">
        {F.months.map((m) => (
          <div key={m.month} className={`in-fbar${m.month === sel ? " sel" : ""}`} onClick={() => setSel(m.month)}>
            <div className="in-fbar-track"><div className="in-fbar-fill" style={{ height: `${(m.raw / max) * 100}%` }} /></div>
            <div className="in-fbar-month">{m.month}</div>
            <div className="in-fbar-total">{m.total}</div>
          </div>
        ))}
      </div>
      <div className="in-expected">
        <div className="in-expected-head"><span>{selMonth.month} · Expected closings</span><span className="ink">{selMonth.total}</span></div>
        {selRows.length === 0 ? <div className="in-item-plan">No closings forecast this month.</div> :
          selRows.map((r, i) => (
            <div className="in-expected-row" key={i}><span>{r.n}</span><span className="ink">{r.v}</span></div>
          ))}
      </div>

      <div className="in-sub-label" style={{ marginTop: 22 }}>{perf.weeklyMovement.label}</div>
      <div className="in-perf-narr">{perf.weeklyMovement.narrative}</div>
      <div className="in-perf-deltas">
        {perf.weeklyMovement.deltas.map((d) => (
          <div className="in-perf-delta" key={d.label}><span className="l">{d.label}</span><span className="v">{d.value}</span></div>
        ))}
      </div>

      <div className="in-sub-label" style={{ marginTop: 22 }}>{perf.activity.label} <span className="in-perf-total">· {perf.activity.totalLabel} ({perf.activity.note})</span></div>
      <div className="in-actgrid">
        {perf.activity.metrics.map((m) => (
          <div className="in-actmetric" key={m.label}>
            <div className="in-actmetric-label">{m.label}</div>
            <div className="in-actmetric-value">{m.value}</div>
            <div className="in-actmetric-delta" style={{ color: m.delta.startsWith("↓") ? "#B45309" : "#10A37F" }}>{m.delta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkBlock() {
  return (
    <div className="in-net">
      <div className="in-net-kpis">
        {net.kpis.map((k) => (
          <div className="in-net-kpi" key={k.label}><div className="in-net-kpi-label">{k.label}</div><div className="in-net-kpi-value">{k.value}</div></div>
        ))}
      </div>

      <div className="in-sub-label" style={{ marginTop: 20 }}>{net.vendorScorecard.label} <span className="in-perf-total">· {net.vendorScorecard.hint}</span></div>
      <div className="in-card" style={{ overflowX: "auto", marginTop: 10 }}>
        <table className="in-table">
          <thead><tr>{net.vendorScorecard.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {net.vendorScorecard.rows.map((r) => (
              <tr key={r.name}>
                <td className="ink">{r.name}</td><td>{r.role}</td><td>{r.deals}</td><td>{r.onTime}</td><td>{r.avg}</td>
                <td style={{ color: r.slaRisk ? "#D0342C" : undefined }}>{r.sla}</td><td>{r.cadence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="in-sub-label" style={{ marginTop: 20 }}>{net.reciprocity.label} <span className="in-perf-total">· {net.reciprocity.hint}</span></div>
      <div className="in-card" style={{ overflowX: "auto", marginTop: 10 }}>
        <table className="in-table">
          <thead><tr>{net.reciprocity.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {net.reciprocity.rows.map((r) => (
              <tr key={r.partner}>
                <td className="ink">{r.partner}</td><td>{r.sent}</td><td>{r.you}</td>
                <td style={{ color: r.risk ? "#D0342C" : undefined }}>{r.balance}</td>
                <td>↳ {r.move}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="in-sub-label" style={{ marginTop: 20 }}>{net.cadence.label}</div>
      <div className="in-cadence-grid">
        {net.cadence.cards.map((c, i) => (
          <div className="in-cadence-card" key={i}>
            <div className="in-cadence-top"><span className="in-cadence-when">{c.when}</span><span className="in-cadence-status" style={{ color: c.risk ? "#D0342C" : "#8F8F8F" }}>{c.status}</span></div>
            <div className="in-cadence-who">{c.who}</div>
            <div className="in-cadence-what">{c.what}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearningLoop() {
  return (
    <div className="in-learn">
      <div className="in-sub-label">Learning loop <span className="in-perf-total">· {learningLoop.hint}</span></div>
      <div className="in-learn-grid">
        {learningLoop.cards.map((c) => (
          <div className="in-card in-learn-card" key={c.title}>
            <div className="in-learn-top"><span className="in-learn-title">{c.title}</span>{c.badge && <span className="in-learn-badge">{c.badge}</span>}</div>
            <div className="in-learn-body" style={{ color: c.bodyRisk ? "#D0342C" : undefined }}>{c.body}</div>
            {c.cta && <button className="in-btn in-btn-ghost" style={{ marginTop: 10 }}>{c.cta}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function NeedsDecision() {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  return (
      <div className="in-queue">
        {I.needsYourDecision.map((d) => (
          <div className="in-item" key={d.id}>
            <div className="in-item-label">{d.label}</div>
            <div className="in-item-body">{d.body}</div>
            <div className="in-item-why">{d.why}</div>
            {resolved[d.id] ? (
              <div className="in-done">{resolved[d.id]}</div>
            ) : (
              <div className="in-actions">
                <button
                  className="in-btn in-btn-primary"
                  onClick={() => {
                    setResolved((r) => ({ ...r, [d.id]: "Approved ✓" }));
                    void recordAction(
                      { actor: "user", skill: "chief-of-staff", action: `Decision approved — ${d.label}` },
                      `decision/${d.id}`,
                      () => setResolved((r) => { const n = { ...r }; delete n[d.id]; return n; }),
                    );
                  }}
                >
                  Approve
                </button>
                <button className="in-btn in-btn-ghost" onClick={() => setResolved((r) => ({ ...r, [d.id]: "Skipped" }))}>Skip</button>
              </div>
            )}
          </div>
        ))}
      </div>
  );
}

function LearnedFields() {
  const [saved, setSaved] = useState<Record<string, string>>({});
  return (
      <div className="in-queue">
        {I.agentLearned.map((l) => (
          <div className="in-item agent" key={l.id}>
            <div className="in-item-label">{l.src}</div>
            <div className="in-item-body">{l.text}</div>
            {saved[l.id] ? (
              <div className="in-done">{l.audit}</div>
            ) : (
              <div className="in-actions">
                <button className="in-btn in-btn-primary" onClick={() => setSaved((s) => ({ ...s, [l.id]: "1" }))}>{l.saveLabel}</button>
                <button className="in-btn in-btn-ghost" onClick={() => setSaved((s) => ({ ...s, [l.id]: "1" }))}>Skip</button>
              </div>
            )}
          </div>
        ))}
      </div>
  );
}
