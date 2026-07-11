import { useState } from "react";
import content from "../../data/seed/content.json";
import type { Referral } from "../../domain/types";
import { newId, save } from "../../data/repository";
import "./PartnerPortal.css";

const P = content.partner;
const COPY = P.portalCopy;

function Tagline() {
  return (
    <div className="pt-tagline">
      <span>{COPY.c1}</span>
      <span>{COPY.c2}</span>
      <span>{COPY.c3}</span>
    </div>
  );
}

/* ---- Dashboard ---- */
export function PartnerDashboard() {
  const D = P.dashboard;
  return (
    <div className="pt-wrap">
      <Tagline />
      <div className="pt-kpis">
        {D.kpis.map((k) => (
          <div className="pt-kpi" key={k.label}>
            <div className="pt-kpi-label">{k.label}</div>
            <div className="pt-kpi-value">{k.value}</div>
            <div className="pt-kpi-note">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="pt-sec-title">Commission ledger</div>
      <div className="pt-sec-desc">25% of gross commission · {D.convLine}</div>
      <div className="pt-table">
        <div className="pt-trow head">
          <span className="pt-th">Deal</span><span className="pt-th">Base GCI</span><span className="pt-th">Your share</span><span className="pt-th">Status</span><span className="pt-th">When</span>
        </div>
        {D.commissionRows.map((r) => (
          <div className="pt-trow" key={r.deal}>
            <span className="pt-td ink">{r.deal}</span>
            <span className="pt-td">{r.base}</span>
            <span className="pt-td ink">{r.share}</span>
            <span className="pt-td">{r.status}</span>
            <span className="pt-td">{r.when}</span>
          </div>
        ))}
      </div>
      <div className="pt-total">{D.totalLine}</div>

      <div className="pt-sec-title">Lead validity</div>
      <div className="pt-sec-desc">Registration timestamps your protection · §3.3</div>
      <div className="pt-table">
        <div className="pt-trow head">
          <span className="pt-th">Client</span><span className="pt-th">Deal</span><span className="pt-th">Registered</span><span className="pt-th">Protected to</span><span className="pt-th">Status</span>
        </div>
        {D.validityRows.map((r) => (
          <div className="pt-trow" key={r.name}>
            <span className="pt-td ink">{r.name}</span>
            <span className="pt-td">{r.deal}</span>
            <span className="pt-td">{r.reg}</span>
            <span className="pt-td">{r.ends} · {r.left}</span>
            <span className="pt-td">{r.st}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Referral board ---- */
export function PartnerPipeline() {
  const cols = COPY.columns;
  return (
    <div className="pt-wrap">
      <Tagline />
      <div className="pt-sec-title">{COPY.boardTitle}</div>
      <div className="pt-sec-desc">Every referral, every stage — live</div>
      <div className="pt-board">
        {cols.map((col) => (
          <div key={col}>
            <div className="pt-col-head">{col}</div>
            {P.referralCards.filter((c) => c.column === col).map((c) => (
              <div className="pt-card" key={c.id}>
                <div className="pt-card-title">{c.title}</div>
                <div className="pt-card-sub">{c.lead} · {c.kind}</div>
                <div className="pt-card-fee">
                  <span className="pt-card-fee-val">{c.fee}</span>
                  <span className="pt-card-fee-status">{c.feeStatus}</span>
                </div>
                <div className="pt-card-next">{c.next ?? c.feeWhen}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- New referral (form → persisted referral) ---- */
export function PartnerNewReferral() {
  const [client, setClient] = useState("");
  const [want, setWant] = useState("");
  const [registered, setRegistered] = useState<string | null>(null);

  async function submit() {
    if (!client.trim()) return;
    const ref: Referral = {
      id: newId("ref"),
      partner_id: "bittencourt",
      client: client.trim(),
      stage: "Acknowledgment window",
      fee_pct: 25,
      agreement_status: "Pending acknowledgment",
      payout_status: "projected",
    };
    await save("referrals", ref, { actor: "user", action: `Referral registered — ${client.trim()}` });
    setRegistered(client.trim());
    setClient("");
    setWant("");
  }

  return (
    <div className="pt-wrap">
      <Tagline />
      <div className="pt-sec-title">{COPY.regTitle}</div>
      <div className="pt-sec-desc">{COPY.regSub}</div>
      <div className="pt-form">
        <div className="pt-form-field">
          <label className="pt-form-label">Client name</label>
          <input className="pt-form-input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Full name" />
        </div>
        <div className="pt-form-field">
          <label className="pt-form-label">What they want</label>
          <textarea className="pt-form-textarea" value={want} onChange={(e) => setWant(e.target.value)} placeholder="e.g. Sunny Isles pre-construction · $4–6M · cash" />
        </div>
        <div className="pt-form-note">Registration timestamps the introduction and starts the agreement before any outreach happens · §3.3</div>
        <button className="pt-submit" onClick={() => void submit()}>Register referral</button>
        {registered && (
          <div className="pt-registered">Registered ✓ — {registered} · protection active · acknowledgment window open. Logged to the audit trail.</div>
        )}
      </div>
    </div>
  );
}

/* ---- Collaterals ---- */
export function PartnerCollaterals() {
  return (
    <div className="pt-wrap">
      <Tagline />
      <div className="pt-sec-title">{COPY.collTitle}</div>
      <div className="pt-sec-desc">{COPY.collSub}</div>
      <div className="pt-collaterals">
        {P.collaterals.map((c) => (
          <div className="pt-coll" key={c.name}>
            <div className="pt-coll-name">{c.name}</div>
            <div className="pt-coll-loc">{c.loc}</div>
            <div className="pt-coll-from">{c.from}</div>
            <div className="pt-coll-updated">{c.delivery} · {c.updated}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
