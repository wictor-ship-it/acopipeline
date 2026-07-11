import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import content from "../../data/seed/content.json";
import type { DocumentRef, Opportunity } from "../../domain/types";
import { getById, newId, remove, save } from "../../data/repository";
import { useCollection } from "../../data/hooks";
import "./DealRecord.css";

type Tab = "record" | "critical" | "documents" | "activity";
const D = content.dealDetail;

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function DealRecord() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("record");
  const [opp, setOpp] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (id) getById<Opportunity>("opportunities", id).then((o) => setOpp(o ?? null));
  }, [id]);

  if (!opp) return <div className="dr-body">Loading…</div>;

  return (
    <div>
      <div className="dr-actionbar">
        <button className="dr-back" onClick={() => navigate(`/deal/${opp.id}`)}>‹ Deal</button>
      </div>
      <div className="dr-hero">
        <div className="dr-title">{opp.name}</div>
        <div className="dr-sub">{opp.contact_name} · {opp.division ?? opp.pipeline} · {opp.source}</div>
      </div>
      <div className="dr-tabs">
        {(["record", "critical", "documents", "activity"] as Tab[]).map((t) => (
          <div key={t} className={`dr-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t === "critical" ? "critical path" : t}</div>
        ))}
      </div>
      <div className="dr-body">
        {tab === "record" && <RecordTab opp={opp} onChange={setOpp} />}
        {tab === "critical" && <CriticalPathTab opp={opp} />}
        {tab === "documents" && <DocumentsTab dealId={opp.id} />}
        {tab === "activity" && <ActivityTab />}
      </div>
    </div>
  );
}

function CriticalPathTab({ opp }: { opp: Opportunity }) {
  const isRef = opp.id === "op_rivage_pha";
  const path = isRef ? D.criticalPath : [{ when: opp.next_due ?? "Next", text: opp.next_action ?? "Advance the deal", owner: "Wictor", urgent: opp.overdue ?? false }];
  const plan = isRef ? D.plan : [];
  return (
    <>
      <div className="dr-cp-strip">
        <div className="dr-cp-stat"><div className="l">Closing</div><div className="v">{opp.next_due ?? "—"}</div></div>
        <div className="dr-cp-stat"><div className="l">Stage</div><div className="v">{opp.stage}</div></div>
        <div className="dr-cp-stat"><div className="l">Probability</div><div className="v">{opp.probability}%</div></div>
        <div className="dr-cp-stat"><div className="l">Status</div><div className="v" style={{ color: opp.overdue ? "#D0342C" : "#10A37F" }}>{opp.overdue ? "At risk" : "On track"}</div></div>
      </div>

      <div className="dr-sec-title">Path to close</div>
      {plan.map((p, i) => (
        <div className="dr-check-row" key={i}>
          <span className="dr-check-step">{p.date}</span>
          <div className="dr-check-main"><div className="dr-check-form">{p.what}</div><div className="dr-check-meta">{p.why}</div></div>
          <span className="dr-check-status" style={{ color: p.color }}>{p.status}</span>
        </div>
      ))}
      {plan.length === 0 && path.map((c, i) => (
        <div className="dr-check-row" key={i}>
          <span className="dr-check-step">{c.when}</span>
          <div className="dr-check-main"><div className="dr-check-form">{c.text}</div></div>
          <span className="dr-check-status" style={{ color: c.urgent ? "#D0342C" : "#8F8F8F" }}>{c.owner}</span>
        </div>
      ))}

      <div className="dr-kill">
        <div className="dr-kill-title">What can kill this deal</div>
        <div className="dr-kill-item">Construction-timeline concern from the spouse — neutralized by the developer schedule now in hand.</div>
        <div className="dr-kill-item">Competing Estates unit — client leans Rivage on layout; keep the momentum with a fast second visit.</div>
        <div className="dr-kill-item">Financing not a factor — cash acquisition, proof of funds on file.</div>
      </div>
    </>
  );
}

function RecordTab({ opp, onChange }: { opp: Opportunity; onChange: (o: Opportunity) => void }) {
  // Editable summary fields — inline edit + auto-save on blur (R4).
  const fields: { key: keyof Opportunity; label: string }[] = [
    { key: "budget", label: "Amount" },
    { key: "next_due", label: "Close Date" },
    { key: "pipeline", label: "Pipeline" },
    { key: "division", label: "Division" },
    { key: "stage", label: "Stage" },
    { key: "source", label: "Source" },
    { key: "next_action", label: "Next Action" },
    { key: "heat", label: "Heat" },
  ];
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function commit(key: keyof Opportunity) {
    setEditing(null);
    if (String(opp[key] ?? "") === draft) return;
    const next = { ...opp, [key]: draft } as Opportunity;
    onChange(next);
    await save("opportunities", next, { actor: "user", action: `Field edited — ${opp.name} · ${key}` });
  }

  return (
    <>
      <div className="dr-sec-title">Deal record — click any value to edit (auto-saves)</div>
      <div className="dr-fields">
        {fields.map((f) => (
          <div className="dr-field" key={String(f.key)}>
            <span className="dr-field-label">{f.label}</span>
            {editing === f.key ? (
              <input
                className="dr-field-input"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void commit(f.key)}
                onKeyDown={(e) => { if (e.key === "Enter") void commit(f.key); }}
              />
            ) : (
              <span className="dr-field-value" onClick={() => { setEditing(String(f.key)); setDraft(String(opp[f.key] ?? "")); }}>
                {String(opp[f.key] ?? "—")}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="dr-sec-title">Contract path</div>
      {D.documents.checklist.map((c) => (
        <div className="dr-check-row" key={c.step}>
          <span className="dr-check-step">{c.step}</span>
          <div className="dr-check-main">
            <div className="dr-check-form">{c.form}</div>
            <div className="dr-check-meta">{c.meta}</div>
          </div>
          <span className="dr-check-status" style={{ color: c.status === "Needs you" ? "#D0342C" : c.status === "Executed" || c.status === "Done" ? "#10A37F" : "#8F8F8F" }}>{c.status}</span>
        </div>
      ))}
    </>
  );
}

function DocumentsTab({ dealId }: { dealId: string }) {
  const { items: allDocs } = useCollection<DocumentRef>("documents");
  const docs = useMemo(() => allDocs.filter((d) => d.entity.kind === "deal" && d.entity.id === dealId), [allDocs, dealId]);
  const [over, setOver] = useState(false);

  async function ingest(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const ext = (f.name.split(".").pop() ?? "FILE").toUpperCase().slice(0, 4);
      // Never store file content on the client — only a Drive reference (R/§7).
      const doc: DocumentRef = {
        id: newId("doc"),
        entity: { kind: "deal", id: dealId },
        drive_ref: `drive://aco/deals/${dealId}/${f.name}`,
        name: f.name,
        type: ext,
        size: fmtSize(f.size),
        uploaded_by: "You",
        at: new Date().toISOString().slice(0, 10),
      };
      await save("documents", doc, { actor: "user", skill: "transaction-coordinator", action: `Document filed to Drive (mock) — ${f.name}` });
    }
  }

  return (
    <>
      <div className="dr-sec-title">Documents — dropped files are referenced from the deal's Drive folder</div>
      <div
        className={`dr-drop${over ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void ingest(e.dataTransfer.files); }}
      >
        Drop documents here → filed to this deal's Google Drive folder (mock)
        <div className="hint">Only a reference is stored — the file never persists on the client (README §7)</div>
      </div>
      {docs.map((d) => (
        <div className="dr-doc-row" key={d.id}>
          <div>
            <div className="dr-doc-name">{d.name}</div>
            <div className="dr-doc-ref">{d.drive_ref}</div>
          </div>
          <span className="dr-doc-meta">{d.type}</span>
          <span className="dr-doc-meta">{d.size}</span>
          <span className="dr-doc-meta">{d.uploaded_by} · {d.at}</span>
          <button className="dr-doc-remove" onClick={() => void remove("documents", d.id, { actor: "user", action: `Document removed — ${d.name}` })}>×</button>
        </div>
      ))}
      {docs.length === 0 && (
        <div className="dr-doc-meta" style={{ padding: "12px 4px" }}>No documents yet — drop a file above to file it to Drive.</div>
      )}
    </>
  );
}

function ActivityTab() {
  return (
    <>
      <div className="dr-sec-title">Activity</div>
      {D.activity.map((a, i) => (
        <div className="dr-check-row" key={i}>
          <span className="dr-check-step">{a.date}</span>
          <div className="dr-check-main">
            <div className="dr-check-form">{a.type}</div>
            <div className="dr-check-meta">{a.body}</div>
          </div>
          <span className="dr-check-status" style={{ color: a.tag === "Advanced" ? "#10A37F" : "#8F8F8F" }}>{a.tag}</span>
        </div>
      ))}
    </>
  );
}
