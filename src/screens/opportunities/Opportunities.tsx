import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Opportunity, Pipeline } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import content from "../../data/seed/content.json";
import "./Opportunities.css";

const PIPES: { key: Pipeline | "all" | "closed"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "purchases", label: "Purchases" },
  { key: "listings", label: "Listings" },
  { key: "rentals", label: "Rentals" },
  { key: "investments", label: "Investments" },
  { key: "offmarket", label: "Off-Market" },
  { key: "closed", label: "Closed" },
];

const STAGE_ORDER = content.pipelineExtras.boardStageOrderAll;

function heatDot(heat?: string): string {
  if (heat === "HOT") return "#0D0D0D";
  if (heat === "WARM") return "#8F8F8F";
  return "#B8B8B8";
}
function dueColor(o: Opportunity): string {
  return o.overdue ? "#D0342C" : "#8F8F8F";
}

/* List columns */
interface LCol { key: string; label: string; get: (o: Opportunity) => string; }
const LCOLS: LCol[] = [
  { key: "pipe", label: "Pipeline", get: (o) => o.pipeline },
  { key: "opp", label: "Client", get: (o) => o.contact_name ?? "—" },
  { key: "stage", label: "Stage", get: (o) => o.stage },
  { key: "budget", label: "Budget", get: (o) => o.budget ?? "—" },
  { key: "prob", label: "Prob", get: (o) => (o.probability != null ? `${o.probability}%` : "—") },
  { key: "next", label: "Next action", get: (o) => o.next_action ?? "—" },
  { key: "due", label: "Due", get: (o) => o.next_due ?? "—" },
];

export function Opportunities() {
  const { items: opps } = useCollection<Opportunity>("opportunities");
  const [pipe, setPipe] = useState<Pipeline | "all" | "closed">("all");
  const [view, setView] = useState<"board" | "list" | "week">("board");
  const [peek, setPeek] = useState<Opportunity | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = opps;
    if (pipe === "closed") list = list.filter((o) => o.stage === "Won" || o.stage === "Lost");
    else if (pipe !== "all") list = list.filter((o) => o.pipeline === pipe);
    return list;
  }, [opps, pipe]);

  const columns = useMemo(() => {
    const byStage = new Map<string, Opportunity[]>();
    for (const o of filtered) {
      const arr = byStage.get(o.stage) ?? [];
      arr.push(o);
      byStage.set(o.stage, arr);
    }
    return [...byStage.entries()].sort(
      (a, b) => STAGE_ORDER.indexOf(a[0]) - STAGE_ORDER.indexOf(b[0]),
    );
  }, [filtered]);

  const listRows = useMemo(() => {
    let list = filtered;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((o) => [o.name, o.contact_name, o.stage].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
    }
    for (const col of LCOLS) {
      const f = filters[col.key];
      if (f?.trim()) list = list.filter((o) => col.get(o).toLowerCase().includes(f.toLowerCase()));
    }
    if (sortKey) {
      const col = LCOLS.find((c) => c.key === sortKey);
      if (col) list = [...list].sort((a, b) => col.get(a).localeCompare(col.get(b), undefined, { numeric: true }) * sortDir);
    }
    return list;
  }, [filtered, query, filters, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) { if (sortDir === 1) setSortDir(-1); else { setSortKey(null); setSortDir(1); } }
    else { setSortKey(key); setSortDir(1); }
  }

  // Week view — bucket by due date relative to the reference day (Jul 06).
  const weekBuckets = useMemo(() => {
    const REF = 6;
    const dayOf = (o: Opportunity): number | null => {
      const m = (o.next_due ?? "").match(/([A-Za-z]{3})\s+(\d{1,2})/);
      if (!m) return null;
      const mi = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(m[1]);
      return mi === 6 ? Number(m[2]) : mi < 6 ? -1 : 99;
    };
    const cols = [
      { key: "overdue", label: "Overdue", items: [] as Opportunity[] },
      { key: "today", label: "Today · Jul 06", items: [] as Opportunity[] },
      { key: "tomorrow", label: "Tomorrow · Jul 07", items: [] as Opportunity[] },
      { key: "thisweek", label: "This week", items: [] as Opportunity[] },
      { key: "nextweek", label: "Next week", items: [] as Opportunity[] },
      { key: "later", label: "Later", items: [] as Opportunity[] },
    ];
    for (const o of filtered) {
      if (o.stage === "Won" || o.stage === "Lost") continue;
      const d = dayOf(o);
      if (o.overdue || (d !== null && d >= 0 && d < REF)) cols[0].items.push(o);
      else if (d === REF) cols[1].items.push(o);
      else if (d === REF + 1) cols[2].items.push(o);
      else if (d !== null && d >= REF + 2 && d <= 12) cols[3].items.push(o);
      else if (d !== null && d >= 13 && d <= 19) cols[4].items.push(o);
      else cols[5].items.push(o);
    }
    return cols;
  }, [filtered]);

  const R = content.pipelineExtras.oppReportsClosed;

  return (
    <div className="op-wrap">
      <div className="op-report">
        <div className="op-report-head">
          <span className="op-report-title">Opportunities report</span>
          <span className="op-report-meta">pipeline · all divisions</span>
        </div>
        <div className="op-report-grid">
          {R.map((r) => (
            <div className="op-card" key={r.label}>
              <div className="op-card-label">{r.label}</div>
              <div className="op-card-value">{r.value}</div>
              <div className="op-card-sub">{r.sub}</div>
              <div className="op-card-deltas">
                {[["30 D", r.d30], ["QTR", r.dQ], ["1 YR", r.dY]].map(([p, v]) => {
                  const down = v.startsWith("-");
                  return (
                    <div className="op-delta" key={p}>
                      <span className="op-delta-p">{p}</span>
                      <span className="op-delta-v" style={{ color: down ? "var(--risk)" : "var(--accent)" }}>{down ? "↓" : "↑"} {v}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="op-filter-row">
        <div className="op-pipes">
          {PIPES.map((p) => (
            <div key={p.key} className={`op-pipe${pipe === p.key ? " active" : ""}`} onClick={() => setPipe(p.key)}>
              {p.label}
            </div>
          ))}
        </div>
        <div className="op-views">
          <div className={`op-view${view === "board" ? " active" : ""}`} onClick={() => setView("board")}>Board</div>
          <div className={`op-view${view === "list" ? " active" : ""}`} onClick={() => setView("list")}>List</div>
          <div className={`op-view${view === "week" ? " active" : ""}`} onClick={() => setView("week")}>Week</div>
        </div>
      </div>

      {view === "board" ? (
        <div className="op-board">
          {columns.map(([stage, cards]) => (
            <div className="op-col" key={stage}>
              <div className="op-col-head">
                <div className="op-col-top">
                  <div className="op-col-stage">{stage}</div>
                  <span className="op-col-playbook">Playbook</span>
                </div>
                <div className="op-col-stats">
                  <span className="op-col-count">{cards.length} opps</span>
                </div>
              </div>
              <div className="op-col-cards">
                {cards.map((c) => (
                  <div className="op-kcard" key={c.id} onClick={() => setPeek(c)}>
                    <div className="op-kcard-top">
                      <span className="op-kcard-name">{c.name}</span>
                      <span className="op-kcard-budget">{c.budget}</span>
                    </div>
                    <div className="op-kcard-opp">{c.card_label}</div>
                    {c.tags && c.tags.length > 0 && (
                      <div className="op-tags">{c.tags.map((t) => <span className="op-tag" key={t}>{t}</span>)}</div>
                    )}
                    <div className="op-kcard-status">
                      <span className="op-dot" style={{ background: heatDot(c.heat) }} />
                      <span className="op-status-text">{c.heat} · {c.probability}%</span>
                    </div>
                    <div className="op-kcard-rule" />
                    <div className="op-kcard-next">
                      <span className="op-next-text">{c.next_action}</span>
                      <span className="op-next-due" style={{ color: dueColor(c) }}>{c.next_due}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : view === "week" ? (
        <div className="op-week">
          {weekBuckets.map((col) => (
            <div className="op-week-col" key={col.key}>
              <div className="op-week-head">
                <span>{col.label}</span>
                <span className="op-week-count">{col.items.length}</span>
              </div>
              {col.items.map((c) => (
                <div className="op-week-card" key={c.id} onClick={() => setPeek(c)}>
                  <div className="op-week-name">{c.name}</div>
                  <div className="op-week-next">{c.next_action}</div>
                  <div className="op-week-foot">
                    <span>{c.budget}</span>
                    <span style={{ color: dueColor(c) }}>{c.next_due}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="op-list">
          <div className="op-lgrid op-lhead">
            <input className="op-lsearch" placeholder="Search deals" value={query} onChange={(e) => setQuery(e.target.value)} />
            {LCOLS.map((col) => (
              <div className="op-lth" key={col.key}>
                <div className={`op-lth-label${sortKey === col.key ? " sorted" : ""}`} onClick={() => toggleSort(col.key)}>
                  {col.label}<span>{sortKey === col.key ? (sortDir === 1 ? "↑" : "↓") : ""}</span>
                </div>
                <button type="button" className={`op-lth-filter${filters[col.key] ? " on" : ""}`} onClick={() => setFilterOpen(filterOpen === col.key ? null : col.key)}>⌕</button>
                {filterOpen === col.key && (
                  <div className="op-filter-pop">
                    <input className="op-filter-input" autoFocus placeholder={`Filter ${col.label}…`} value={filters[col.key] ?? ""} onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })} />
                    <div className="op-filter-actions">
                      <button type="button" className="op-filter-clear" onClick={() => setFilters({ ...filters, [col.key]: "" })}>Clear</button>
                      <button type="button" className="op-filter-done" onClick={() => setFilterOpen(null)}>Done</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {listRows.map((c) => (
            <div className="op-lgrid op-lrow" key={c.id} onClick={() => setPeek(c)}>
              <div className="op-lcell name"><span className="op-dot" style={{ background: heatDot(c.heat) }} />{c.name}</div>
              <div className="op-lcell pipe">{c.pipeline}</div>
              <div className="op-lcell">{c.contact_name ?? "—"}</div>
              <div className="op-lcell">{c.stage}</div>
              <div className="op-lcell budget">{c.budget}</div>
              <div className="op-lcell">{c.probability}%</div>
              <div className="op-lcell">{c.next_action}</div>
              <div className="op-lcell" style={{ color: dueColor(c) }}>{c.next_due}</div>
            </div>
          ))}
        </div>
      )}

      {peek && <Peek opp={peek} onClose={() => setPeek(null)} />}
    </div>
  );
}

function Peek({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="op-peek-overlay" onClick={onClose} />
      <div className="op-peek">
        <div className="op-peek-head">
          <div className="op-peek-eyebrow">
            <span className="op-peek-div">{opp.division ?? opp.pipeline}</span>
            <button className="op-peek-close" onClick={onClose}>×</button>
          </div>
          <div className="op-peek-name">{opp.name}</div>
          <div className="op-peek-status">
            <span className="op-dot" style={{ background: heatDot(opp.heat) }} />
            <span className="op-peek-status-text">{opp.heat} · {opp.stage}</span>
          </div>
        </div>
        <div className="op-peek-body">
          <div className="op-peek-nums">
            <div className="op-peek-num"><div className="l">Budget</div><div className="v">{opp.budget}</div></div>
            <div className="op-peek-num"><div className="l">Probability</div><div className="v">{opp.probability}%</div></div>
            <div className="op-peek-num"><div className="l">GCI</div><div className="v">{opp.gci ?? "—"}</div></div>
          </div>
          {opp.narrative && (
            <div className="op-peek-note">
              <div className="k">Agent note</div>
              <div className="t">{opp.next_action} · due {opp.next_due}</div>
            </div>
          )}
          {opp.narrative && (
            <div className="op-peek-section">
              <div className="sh">Overview</div>
              <div className="op-peek-narr">{opp.narrative}</div>
            </div>
          )}
        </div>
        <button className="dl-btn dl-btn-primary op-peek-open" onClick={() => navigate(`/deal/${opp.id}`)}>
          Open deal record ›
        </button>
      </div>
    </>
  );
}
