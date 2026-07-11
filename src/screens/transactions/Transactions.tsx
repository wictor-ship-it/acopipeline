import { useMemo, useState } from "react";
import content from "../../data/seed/content.json";
import type { Transaction } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import "./Transactions.css";

const KPIS = content.transactionsClosed.kpis;

/** Milestones synthesized from the progress label (v5 keeps richer data on
 *  the record; Phase 1 shows a representative checklist). */
function milestonesFor(t: Transaction): { label: string; done: boolean; due?: string }[] {
  const base = [
    { label: "Contract effective", done: true },
    { label: "Escrow deposit received", done: true },
    { label: "Inspection period", done: (t.pct ?? "0%") >= "33%" },
    { label: "HOA / association approval", done: false, due: t.next_peek },
    { label: "Clear to close", done: false },
    { label: "Closing", done: false, due: t.close_date },
  ];
  return base;
}

export function Transactions() {
  const { items: txs } = useCollection<Transaction>("transactions");
  const [sel, setSel] = useState<Transaction | null>(null);
  const [sortKey, setSortKey] = useState<keyof Transaction | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const rows = useMemo(() => {
    if (!sortKey) return txs;
    return [...txs].sort((a, b) => String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, { numeric: true }) * sortDir);
  }, [txs, sortKey, sortDir]);

  function toggleSort(k: keyof Transaction) {
    if (sortKey === k) { if (sortDir === 1) setSortDir(-1); else { setSortKey(null); setSortDir(1); } }
    else { setSortKey(k); setSortDir(1); }
  }

  return (
    <div className="tc-wrap">
      <div className="tc-kpis">
        {KPIS.map(([label, value]) => (
          <div className="tc-kpi" key={label}>
            <div className="tc-kpi-label">{label}</div>
            <div className="tc-kpi-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="tc-head">
        <span className="tc-title">In Contract</span>
        <span className="tc-meta">{txs.length} transactions · agent tracks every milestone</span>
      </div>

      <div className="tc-table">
        <div className="tc-thead">
          <div className="tc-th" onClick={() => toggleSort("property")}>Deal</div>
          <div className="tc-th" onClick={() => toggleSort("meta")}>Type</div>
          <div className="tc-th" onClick={() => toggleSort("pct")}>Progress</div>
          <div className="tc-th" onClick={() => toggleSort("status")}>Status</div>
          <div className="tc-th" onClick={() => toggleSort("gci")}>GCI</div>
          <div className="tc-th" onClick={() => toggleSort("close_date")}>Closing</div>
        </div>
        {rows.map((t) => (
          <div className="tc-row" key={t.id} onClick={() => setSel(t)}>
            <div className="tc-prop">
              <span className="tc-prop-name">{t.property}</span>
              <span className="tc-prop-meta">{t.meta}</span>
            </div>
            <div className="tc-cell">{t.deal_type}</div>
            <div className="tc-progress">
              <span className="tc-progress-label">{t.milestones_label}</span>
              <div className="tc-progress-bar"><span style={{ width: t.pct }} /></div>
            </div>
            <div className="tc-status" style={{ color: t.status_color ?? "#5D5D5D" }}>{t.status}</div>
            <div className="tc-gci">{t.gci}</div>
            <div className="tc-cell">{t.close_date}</div>
          </div>
        ))}
      </div>

      {sel && (
        <>
          <div className="tc-overlay" onClick={() => setSel(null)} />
          <div className="tc-drawer">
            <div className="tc-drawer-head">
              <button className="tc-drawer-close" onClick={() => setSel(null)}>×</button>
              <div className="tc-drawer-name">{sel.property}</div>
              <div className="tc-drawer-meta">{sel.meta} · {sel.gci} · {sel.close_date}</div>
            </div>
            <div className="tc-milestones">
              <div className="tc-ms-title">Milestones</div>
              {milestonesFor(sel).map((m, i) => (
                <div className="tc-ms-row" key={i}>
                  <span className="tc-ms-dot" style={{ background: m.done ? "#10A37F" : "#D9D9D9" }} />
                  <span className="tc-ms-label">{m.label}</span>
                  {m.due && <span className="tc-ms-due">{m.due}</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
