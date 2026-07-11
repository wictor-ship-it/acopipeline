import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import content from "../../data/seed/content.json";
import type { Opportunity } from "../../domain/types";
import { getById, recordAction } from "../../data/repository";
import "./DealDetail.css";

type Seg = "now" | "plan" | "memory" | "file";

const D = content.dealDetail;

export function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seg, setSeg] = useState<Seg>("now");
  const [opp, setOpp] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (id) getById<Opportunity>("opportunities", id).then((o) => setOpp(o ?? null));
  }, [id]);

  // The Rivage record is the hand-built reference; others show the same
  // grammar populated from the opportunity fields (v5 synthesizes likewise).
  const isReference = id === "op_rivage_pha";

  const title = isReference ? D.title : opp?.name ?? "Deal";
  const heat = isReference ? D.heat : opp?.heat ?? "";
  const party = isReference ? D.party : opp?.contact_name ?? "";
  const division = isReference ? D.division : opp?.division ?? opp?.pipeline ?? "";
  const source = isReference ? D.source : opp?.source ?? "";

  return (
    <div>
      <div className="dl-actionbar">
        <button className="dl-back" onClick={() => navigate("/opportunities")}>‹ Pipeline</button>
        <div className="dl-actions">
          <button className="dl-abtn">Share room</button>
          <button className="dl-abtn">Actions ▾</button>
          <button className="dl-abtn solid">Advance stage</button>
        </div>
      </div>

      <div className="dl-pinned">
        <div className="dl-hero">
          <div className="dl-hero-eyebrow">{division} · {source}</div>
          <div className="dl-hero-titlerow">
            <span className="dl-title">{title}</span>
            <span className="dl-heat">
              <span className="dl-heat-dot" style={{ background: heat === "HOT" ? "#0D0D0D" : "#8F8F8F" }} />
              <span className="dl-heat-label">{heat}</span>
            </span>
            <span className="dl-party">{party}</span>
          </div>
          {isReference && (
            <div className="dl-refline">
              <span className="dot" />
              <span className="txt">{D.referralLine}</span>
            </div>
          )}
        </div>

        <div className="dl-vitals">
          {isReference ? (
            <>
              <Vital label={D.vitals.stage.label} value={D.vitals.stage.value} sub={D.vitals.stage.sub} />
              <Vital label={D.vitals.budget.label} value={D.vitals.budget.value} />
              <Vital label={D.vitals.probability.label} value={`${D.vitals.probability.value}%`} sub={D.vitals.probability.sub} />
              <Vital label={D.vitals.potentialGci.label} value={D.vitals.potentialGci.value} sub={D.vitals.potentialGci.sub} />
              <Vital label={D.vitals.momentum.label} value={D.vitals.momentum.value} unit={D.vitals.momentum.unit} sub={D.vitals.momentum.note} />
            </>
          ) : (
            <>
              <Vital label="Stage" value={opp?.stage ?? "—"} />
              <Vital label="Budget" value={opp?.budget ?? "—"} />
              <Vital label="Probability" value={opp?.probability != null ? `${opp.probability}%` : "—"} />
              <Vital label="Potential GCI" value={opp?.gci ?? "—"} />
              <Vital label="Next" value={opp?.next_due ?? "—"} sub={opp?.next_action} />
            </>
          )}
        </div>

        <div className="dl-menu">
          {(["now", "plan", "memory", "file"] as Seg[]).map((s) => (
            <div key={s} className={`dl-seg${seg === s ? " active" : ""}`} onClick={() => setSeg(s)}>
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="dl-body">
        {!isReference ? (
          <SyntheticSection seg={seg} opp={opp} />
        ) : seg === "now" ? (
          <NowQueue />
        ) : seg === "plan" ? (
          <PlanSection />
        ) : seg === "memory" ? (
          <MemorySection />
        ) : (
          <FileSection />
        )}
      </div>
    </div>
  );
}

function Vital({ label, value, sub, unit }: { label: string; value: string; sub?: string; unit?: string }) {
  return (
    <div className="dl-vital">
      <div className="dl-vital-label">{label}</div>
      <div className="dl-vital-value">{value}{unit && <span className="unit">{unit}</span>}</div>
      {sub && <div className="dl-vital-sub">{sub}</div>}
    </div>
  );
}

function NowQueue() {
  const [resolved, setResolved] = useState<Record<number, boolean>>({});
  const items = D.nowQueue;

  function approve(idx: number, label: string) {
    setResolved((r) => ({ ...r, [idx]: true }));
    void recordAction(
      { actor: "user", skill: "senior-advisor", action: `Approved & sent (mock) — ${label}` },
      `deal/op_rivage_pha/now/${idx}`,
      () => setResolved((r) => { const n = { ...r }; delete n[idx]; return n; }),
    );
  }

  return (
    <>
      <div className="dl-sec-title">Now — a single approval queue</div>
      <div className="dl-queue">
        {items.map((it, idx) => {
          if (resolved[idx]) {
            return <div className="dl-item" key={idx}><div className="dl-sent">Resolved ✓ · logged — undo available</div></div>;
          }
          if (it.type === "primary_draft") {
            return (
              <div className="dl-item" key={idx}>
                <div className="dl-item-label">{it.label}</div>
                <div className="dl-item-head">{it.head}</div>
                <div className="dl-item-draft">{it.draft}</div>
                <div className="dl-actions-row">
                  <button className="dl-btn dl-btn-primary" onClick={() => approve(idx, "primary draft")}>{it.approveLabel}</button>
                  <button className="dl-btn dl-btn-ghost">Edit</button>
                  <button className="dl-btn dl-btn-ghost" onClick={() => approve(idx, "primary draft")}>Skip</button>
                </div>
              </div>
            );
          }
          if (it.type === "mls_match") {
            return (
              <div className="dl-item" key={idx}>
                <div className="dl-item-label">{it.title}</div>
                <div className="dl-item-lang">{it.langNote}</div>
                {it.matches?.map((m, i) => (
                  <div className="dl-matchrow" key={i}><span className="m1">{m[0]}</span><span className="m2">{m[1]}</span><span className="m3">{m[2]}</span></div>
                ))}
                <div className="dl-actions-row">
                  <button className="dl-btn dl-btn-primary" onClick={() => approve(idx, "MLS match")}>Approve &amp; send</button>
                  <button className="dl-btn dl-btn-ghost">Review</button>
                  <button className="dl-btn dl-btn-ghost" onClick={() => approve(idx, "MLS match")}>Skip</button>
                </div>
              </div>
            );
          }
          if (it.type === "tour_planning") {
            return (
              <div className="dl-item" key={idx}>
                <div className="dl-item-label">{it.title}</div>
                <div className="dl-item-lang">{it.summary}</div>
                {it.stops?.map((s, i) => (
                  <div className="dl-tourstop" key={i}><span className="t">{s.t}</span><span className="a">{s.addr}</span><span className="n">{s.note}</span></div>
                ))}
                <div className="dl-actions-row">
                  <button className="dl-btn dl-btn-primary" onClick={() => approve(idx, "tour itinerary")}>Confirm &amp; notify</button>
                  <button className="dl-btn dl-btn-ghost" onClick={() => approve(idx, "tour itinerary")}>Skip</button>
                </div>
              </div>
            );
          }
          if (it.type === "deal_overview_fields") {
            return (
              <div className="dl-item" key={idx}>
                <div className="dl-item-label">{it.title}</div>
                <div className="dl-item-lang">{it.sub}</div>
                {it.fieldsNeedingReview?.map((f, i) => (
                  <div className="dl-fieldrow" key={i}><span className="fl">{f.label}</span><span className="fv">{f.value}</span><span className="fs">{f.src}</span></div>
                ))}
                <div className="dl-actions-row">
                  <button className="dl-btn dl-btn-primary" onClick={() => approve(idx, "deal fields")}>Confirm fields</button>
                  <button className="dl-btn dl-btn-ghost" onClick={() => approve(idx, "deal fields")}>Skip</button>
                </div>
              </div>
            );
          }
          // redline
          return (
            <div className="dl-item" key={idx}>
              <div className="dl-item-label">{it.title}</div>
              <div className="dl-item-lang">{it.meta}</div>
              {it.rows?.map((r, i) => (
                <div className="dl-redrow" key={i}><span className="rc">{r.clause}</span><span className="ry">{r.yours}</span><span className="rn">{r.counter}</span><span className="rt">{r.tag}</span></div>
              ))}
              <div className="dl-actions-row">
                <button className="dl-btn dl-btn-primary" onClick={() => approve(idx, "redline")}>Accept</button>
                <button className="dl-btn dl-btn-ghost" onClick={() => approve(idx, "redline")}>Push back</button>
                <button className="dl-btn dl-btn-ghost" onClick={() => approve(idx, "redline")}>Park</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PlanSection() {
  return (
    <>
      <div className="dl-sec-title">Plan — playbook &amp; critical path</div>
      <div className="dl-tl">
        {D.plan.map((p, i) => (
          <div className="dl-tl-row" key={i}>
            <span className="dl-tl-date">{p.date}</span>
            <div className="dl-tl-main"><div className="dl-tl-what">{p.what}</div><div className="dl-tl-why">{p.why}</div></div>
            <span className="dl-tl-status" style={{ color: p.color }}>{p.status}</span>
          </div>
        ))}
      </div>
      <div className="dl-crit-title">Critical path</div>
      {D.criticalPath.map((c, i) => (
        <div className="dl-crit-row" key={i}>
          <span className="dl-crit-when" style={{ color: c.urgent ? "#D0342C" : "#8F8F8F" }}>{c.when}</span>
          <span className="dl-crit-text">{c.text}</span>
          <span className="dl-crit-owner">{c.owner}</span>
        </div>
      ))}
    </>
  );
}

function MemorySection() {
  return (
    <>
      <div className="dl-sec-title">Memory — what already happened</div>
      <div className="dl-tl">
        {D.activity.map((m, i) => (
          <div className="dl-tl-row" key={i}>
            <span className="dl-tl-date">{m.date}</span>
            <span className="dl-tl-type">{m.type}</span>
            <div className="dl-tl-main"><div className="dl-tl-why" style={{ color: "var(--body)", fontSize: 13 }}>{m.body}</div></div>
            <span className="dl-tl-status" style={{ color: m.tag === "Advanced" ? "#10A37F" : "#8F8F8F" }}>{m.tag}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function FileSection() {
  return (
    <>
      <div className="dl-sec-title">File — reference</div>
      <div className="dl-file-block">
        <div className="dl-file-h">MLS facts</div>
        {D.file.mlsFacts.map((f, i) => (
          <div className="dl-file-row" key={i}><span className="k">{f[0]}</span><span className="v">{f[1]}</span></div>
        ))}
      </div>
      <div className="dl-file-block">
        <div className="dl-file-h">Drive files</div>
        {D.file.driveFiles.map((f, i) => (
          <div className="dl-file-row" key={i}><span className="k">{f[0]}</span><span className="v">{f[1]}</span></div>
        ))}
      </div>
    </>
  );
}

function SyntheticSection({ seg, opp }: { seg: Seg; opp: Opportunity | null }) {
  if (!opp) return <div className="dl-sec-title">Loading…</div>;
  if (seg === "now") {
    return (
      <>
        <div className="dl-sec-title">Now</div>
        <div className="dl-queue">
          <div className="dl-item">
            <div className="dl-item-label">{opp.heat} · {opp.stage}</div>
            <div className="dl-item-head">{opp.next_action}</div>
            <div className="dl-item-lang">Due {opp.next_due}</div>
          </div>
        </div>
      </>
    );
  }
  if (seg === "memory") {
    return (
      <>
        <div className="dl-sec-title">Memory</div>
        <div className="dl-tl"><div className="dl-tl-row"><div className="dl-tl-main"><div className="dl-tl-why" style={{ fontSize: 13, color: "var(--body)" }}>{opp.narrative ?? "No history logged yet."}</div></div></div></div>
      </>
    );
  }
  if (seg === "file") {
    return (
      <>
        <div className="dl-sec-title">File</div>
        <div className="dl-file-block">
          <div className="dl-file-row"><span className="k">Pipeline</span><span className="v">{opp.pipeline}</span></div>
          <div className="dl-file-row"><span className="k">Division</span><span className="v">{opp.division ?? "—"}</span></div>
          <div className="dl-file-row"><span className="k">Source</span><span className="v">{opp.source ?? "—"}</span></div>
          <div className="dl-file-row"><span className="k">Budget</span><span className="v">{opp.budget ?? "—"}</span></div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="dl-sec-title">Plan</div>
      <div className="dl-tl"><div className="dl-tl-row"><span className="dl-tl-date">{opp.next_due}</span><div className="dl-tl-main"><div className="dl-tl-what">{opp.next_action}</div></div></div></div>
    </>
  );
}
