import { useState } from "react";
import content from "../../data/seed/content.json";
import { recordAction } from "../../data/repository";
import "./Marketing.css";

const COLLATERALS = content.partner.collaterals;
const KIT = content.partner.collateralKitItems;

/** Agent-staged campaigns drawn from the opportunity plays (Fase 1 mock). */
const CAMPAIGNS = content.intelligence.opportunityPlays.map((p, i) => ({
  id: `camp_${i}`,
  name: p.title,
  status: "Draft ready",
  body: p.body,
}));

const KPIS = [
  { label: "Conversations Started · 7D", value: "14", sub: "+6 vs prior week", up: true },
  { label: "Tours from Campaigns", value: "3", sub: "2 corridor · 1 seller" },
  { label: "Pipeline Influenced", value: "$2.1M", sub: "weighted GCI" },
  { label: "Awaiting Approval", value: "2", sub: "campaigns", risk: true },
];

const WA_RULES = [
  { status: "HOT", color: "#0D0D0D", rule: "1:1, you approve each" },
  { status: "WARM", color: "#8F8F8F", rule: "1:1 by the agent, inside approved campaigns" },
  { status: "NURTURE", color: "#8F8F8F", rule: "segment broadcast" },
];

const TABS = ["Campaigns", "Content", "Audiences", "Trends"];

export function Marketing() {
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState("Campaigns");

  function approve(id: string, name: string) {
    setApproved((a) => ({ ...a, [id]: true }));
    void recordAction(
      { actor: "user", skill: "chief-of-staff", action: `Campaign approved (mock) — ${name}` },
      `campaign/${id}`,
      () => setApproved((a) => { const n = { ...a }; delete n[id]; return n; }),
    );
  }

  return (
    <div className="mk-wrap">
      <div className="mk-tabs">
        {TABS.map((t) => (
          <div key={t} className={`mk-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>

      <div className="mk-kpis">
        {KPIS.map((k) => (
          <div className="mk-kpi" key={k.label}>
            <div className="mk-kpi-label">{k.label}</div>
            <div className="mk-kpi-value" style={k.risk ? { color: "var(--risk)" } : undefined}>{k.value}</div>
            <div className="mk-kpi-sub" style={k.up ? { color: "var(--accent)" } : undefined}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mk-rules">
        <span className="mk-rules-label">WhatsApp rules</span>
        {WA_RULES.map((r) => (
          <div className="mk-rule" key={r.status}>
            <span className="mk-rule-status" style={{ color: r.color }}>{r.status} →</span>
            <span className="mk-rule-text">{r.rule}</span>
          </div>
        ))}
        <span className="mk-rule-note">every send auto-localized to the contact's language</span>
      </div>

      {tab !== "Campaigns" && (
        <section>
          <div className="mk-sec-title">{tab}</div>
          <div className="mk-sec-desc">The agent assembles {tab.toLowerCase()} from your book — review and approve here. Nothing publishes without you (Law 1).</div>
        </section>
      )}

      {tab === "Campaigns" && (
      <>
      <section>
        <div className="mk-sec-title">Campaigns</div>
        <div className="mk-sec-desc">Agent-drafted campaigns — nothing goes out without your approval (Law 1)</div>
        <div className="mk-campaigns">
          {CAMPAIGNS.map((c) => (
            <div className="mk-campaign" key={c.id}>
              <div className="mk-campaign-top">
                <span className="mk-campaign-name">{c.name}</span>
                <span className="mk-campaign-status">{c.status}</span>
              </div>
              <div className="mk-campaign-body">{c.body}</div>
              {approved[c.id] ? (
                <div className="mk-done">Approved &amp; scheduled (mock) — undo available</div>
              ) : (
                <div className="mk-campaign-actions">
                  <button className="mk-btn mk-btn-primary" onClick={() => approve(c.id, c.name)}>Approve &amp; schedule</button>
                  <button className="mk-btn mk-btn-ghost">Edit</button>
                  <button className="mk-btn mk-btn-ghost" onClick={() => approve(c.id, c.name)}>Skip</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mk-sec-title">Collaterals</div>
        <div className="mk-sec-desc">Pre-development inventory — brochures, floor plans, price lists, always current</div>
        <div className="mk-collaterals">
          {COLLATERALS.map((c) => (
            <div className="mk-coll" key={c.name}>
              <div className="mk-coll-name">{c.name}</div>
              <div className="mk-coll-loc">{c.loc}</div>
              <div className="mk-coll-meta">
                <span className="mk-coll-from">{c.from}</span>
                <span className="mk-coll-status">{c.status}</span>
              </div>
              <div className="mk-coll-kit">{KIT.map((k) => <span className="mk-kit-chip" key={k}>{k}</span>)}</div>
              <div className="mk-coll-updated">{c.delivery} · {c.updated}</div>
            </div>
          ))}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
