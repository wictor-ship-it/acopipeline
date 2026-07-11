import { useState } from "react";
import content from "../../data/seed/content.json";
import type { Draft } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import { recordAction } from "../../data/repository";
import { agentService } from "../../agent/MockAgentService";
import "./Intelligence.css";

const I = content.intelligence;

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

      {/* Pipeline health */}
      <section className="in-section">
        <div className="in-sec-head"><span className="in-sec-title">Pipeline health</span></div>
        <div className="in-card in-health">
          <div className="in-health-top">
            <span className="in-health-score">{I.pipelineHealth.score}</span>
            <span className="in-health-trend">{I.pipelineHealth.trend}</span>
          </div>
          <div className="in-factors">
            {I.pipelineHealth.factors.map((f) => (
              <div className="in-factor" key={f.label}>
                <div className="fl"><span className="fk">{f.label}</span><span className="fv">{f.value}</span></div>
                <div className="in-bar"><span style={{ width: f.w }} /></div>
              </div>
            ))}
          </div>
          <div className="in-money-strip">
            {I.pipelineHealth.moneyStrip.map((m) => (
              <div className="in-money" key={m.label}>
                <div className="ml">{m.label}</div>
                <div className="mv">{m.value}</div>
                <div className="ms">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Needs your decision */}
      <NeedsDecision />

      {/* Touch Today — the draft approval queue */}
      <section className="in-section">
        <div className="in-sec-head">
          <span className="in-sec-title">{I.touchToday.header}</span>
          <span className="in-sec-hint">{I.touchToday.headerHint}</span>
        </div>
        <div className="in-queue">
          {pending.length === 0 && (
            <div className="in-item">All caught up — the queue is clear. The agent stages the next batch overnight.</div>
          )}
          {pending.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </div>
        <div className="in-bulk" style={{ marginTop: 12 }}>
          <span className="in-bulk-note">{I.touchToday.footer}</span>
        </div>
      </section>

      {/* Agent learned */}
      <LearnedFields />

      {/* Risk radar */}
      <section className="in-section">
        <div className="in-sec-head">
          <span className="in-sec-title">Risk radar</span>
          <span className="in-sec-hint">{I.riskRadar.thresholdsNote}</span>
        </div>
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
                <button className="in-btn in-btn-ghost">Review</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Opportunity plays */}
      <section className="in-section">
        <div className="in-sec-head"><span className="in-sec-title">Opportunity plays</span></div>
        <div className="in-cards-grid">
          {I.opportunityPlays.map((p) => (
            <div className="in-card in-play" key={p.title}>
              <div className="in-play-title">{p.title}</div>
              <div className="in-play-body">{p.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Money in motion */}
      <section className="in-section">
        <div className="in-sec-head"><span className="in-sec-title">Money in motion</span></div>
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
      </section>

      {/* Agent ledger overnight */}
      <section className="in-section">
        <div className="in-sec-head"><span className="in-sec-title">Agent ledger · overnight</span></div>
        <div className="in-card" style={{ padding: "8px 20px 12px" }}>
          {I.agentLedgerOvernight.map((l, i) => (
            <div className="in-ledger-row" key={i}>
              <span className="in-ledger-time">{l.time}</span>
              <span className="in-ledger-tag">{l.tag}</span>
              <span className="in-ledger-text">{l.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DraftCard({ draft }: { draft: Draft }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(draft.body);

  return (
    <div className="in-item agent">
      <div className="in-item-meta">
        <span className="in-item-label">{draft.name_label} · {draft.value_label} · {draft.language}</span>
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

function NeedsDecision() {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  return (
    <section className="in-section">
      <div className="in-sec-head"><span className="in-sec-title">Needs your decision</span></div>
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
    </section>
  );
}

function LearnedFields() {
  const [saved, setSaved] = useState<Record<string, string>>({});
  return (
    <section className="in-section">
      <div className="in-sec-head"><span className="in-sec-title">Agent learned</span></div>
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
    </section>
  );
}
