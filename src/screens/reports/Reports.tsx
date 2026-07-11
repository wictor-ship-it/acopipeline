import { useMemo } from "react";
import content from "../../data/seed/content.json";
import type { Opportunity } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import "./Reports.css";

const STAGE_ORDER = content.pipelineExtras.boardStageOrderAll;

export function Reports() {
  const { items: opps } = useCollection<Opportunity>("opportunities");

  // Funnel — count opportunities per stage (live from data).
  const funnel = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of opps) m.set(o.stage, (m.get(o.stage) ?? 0) + 1);
    const rows = [...m.entries()].sort((a, b) => STAGE_ORDER.indexOf(a[0]) - STAGE_ORDER.indexOf(b[0]));
    const max = Math.max(1, ...rows.map(([, n]) => n));
    return { rows, max };
  }, [opps]);

  // Pipeline by source — group + count + sum probability-weighted intent.
  const bySource = useMemo(() => {
    const m = new Map<string, { count: number }>();
    for (const o of opps) {
      const s = o.source ?? "—";
      const cur = m.get(s) ?? { count: 0 };
      cur.count += 1;
      m.set(s, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [opps]);

  const won = opps.filter((o) => o.stage === "Won").length;
  const lost = opps.filter((o) => o.stage === "Lost").length;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const KPIS = content.transactionsClosed.kpis;

  return (
    <div className="rp-wrap">
      <section>
        <div className="rp-sec-title">GCI &amp; volume · YTD</div>
        <div className="rp-sec-desc">Realized performance — net to A/CO</div>
        <div className="rp-kpis">
          {KPIS.map(([label, value]) => (
            <div className="rp-kpi" key={label}><div className="rp-kpi-label">{label}</div><div className="rp-kpi-value">{value}</div></div>
          ))}
        </div>
      </section>

      <section>
        <div className="rp-sec-title">Pipeline funnel</div>
        <div className="rp-sec-desc">Open opportunities by stage — computed live</div>
        <div className="rp-funnel">
          {funnel.rows.map(([stage, n]) => (
            <div className="rp-funnel-row" key={stage}>
              <span className="rp-funnel-stage">{stage}</span>
              <div className="rp-funnel-bar"><span style={{ width: `${(n / funnel.max) * 100}%` }} /></div>
              <span className="rp-funnel-count">{n}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="rp-sec-title">Pipeline by source</div>
        <div className="rp-sec-desc">Where opportunities originate</div>
        <div className="rp-table">
          <div className="rp-trow head"><span className="rp-th">Source</span><span className="rp-th">Opportunities</span><span className="rp-th">Share</span></div>
          {bySource.map(([source, { count }]) => (
            <div className="rp-trow" key={source}>
              <span className="rp-td ink">{source}</span>
              <span className="rp-td">{count}</span>
              <span className="rp-td">{Math.round((count / opps.length) * 100)}%</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="rp-sec-title">Performance</div>
        <div className="rp-sec-desc">Win rate and outcomes across the book</div>
        <div className="rp-kpis">
          <div className="rp-kpi"><div className="rp-kpi-label">Win Rate</div><div className="rp-kpi-value">{winRate}%</div><div className="rp-kpi-sub">{won} won · {lost} lost</div></div>
          <div className="rp-kpi"><div className="rp-kpi-label">Open Opportunities</div><div className="rp-kpi-value">{opps.length - won - lost}</div><div className="rp-kpi-sub">pre-close</div></div>
          <div className="rp-kpi"><div className="rp-kpi-label">Won</div><div className="rp-kpi-value">{won}</div><div className="rp-kpi-sub">closed this book</div></div>
          <div className="rp-kpi"><div className="rp-kpi-label">Lost</div><div className="rp-kpi-value">{lost}</div><div className="rp-kpi-sub">recycled to nurture</div></div>
        </div>
      </section>
    </div>
  );
}
