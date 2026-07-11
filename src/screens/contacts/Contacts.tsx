import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Contact } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import content from "../../data/seed/content.json";
import "./Contacts.css";

/* Column model — default 6 + addable extras (v5 parity). */
interface Col {
  key: string;
  label: string;
  removable: boolean;
  get: (c: Contact) => string;
}

const DEFAULT_COLS: Col[] = [
  { key: "name", label: "Name", removable: false, get: (c) => c.name },
  { key: "relationship", label: "Relationship", removable: false, get: (c) => c.relationship ?? "—" },
  { key: "location", label: "Location", removable: false, get: (c) => c.location ?? "—" },
  { key: "active", label: "Active", removable: false, get: (c) => c.active_deals ?? "—" },
  { key: "lifetime", label: "Lifetime GCI", removable: false, get: (c) => c.lifetime_gci ?? "—" },
  { key: "lastTouch", label: "Last Touch", removable: false, get: (c) => c.last_touch ?? "—" },
];

const EXTRA_COLS: Col[] = [
  { key: "tags", label: "Tags", removable: true, get: (c) => (c.tags ?? []).join(" · ") || "—" },
  { key: "status", label: "Status", removable: true, get: (c) => c.directory_status ?? "—" },
  { key: "phone", label: "Phone", removable: true, get: (c) => c.phone ?? "—" },
  { key: "email", label: "Email", removable: true, get: (c) => c.email ?? "—" },
  { key: "since", label: "Client Since", removable: true, get: (c) => c.since ?? "—" },
  { key: "dealsWon", label: "Deals Won", removable: true, get: (c) => c.deals_won ?? "—" },
  { key: "category", label: "Category", removable: true, get: (c) => c.category },
  { key: "prefAsset", label: "Preferred Asset", removable: true, get: (c) => String((c.preferences as { asset?: string } | undefined)?.asset ?? "—") },
  { key: "budget", label: "Budget Range", removable: true, get: (c) => String((c.preferences as { budget?: string } | undefined)?.budget ?? "—") },
];

const SEGMENTS = [
  { key: "all", label: "All" },
  { key: "client", label: "Clients" },
  { key: "prospect", label: "Prospects" },
  { key: "sphere", label: "Sphere" },
  { key: "partner", label: "Partners" },
  { key: "vendor", label: "Vendors" },
] as const;

/** v5 dot color per directory badge. */
function dotFor(c: Contact): string {
  const s = c.directory_status ?? "";
  if (s === "SLIPPING" || s === "YOU OWE") return "#D0342C";
  if (s === "HOT" || s === "VENDOR" || s === "PARTNER") return "#0D0D0D";
  return "#8F8F8F";
}

const REPORTS = [
  { label: "Active Contacts", value: content.contactDetailExtras.contactReportsAll.activeContacts.value, sub: "in cadence", deltas: [["30 D", content.contactDetailExtras.contactReportsAll.activeContacts.d30], ["QTR", content.contactDetailExtras.contactReportsAll.activeContacts.dQ], ["1 YR", content.contactDetailExtras.contactReportsAll.activeContacts.dY]] },
  { label: "Touch Compliance", value: content.contactDetailExtras.contactReportsAll.touchCompliance, sub: "on cadence", deltas: [] },
  { label: "At-Risk", value: content.contactDetailExtras.contactReportsAll.atRisk, sub: "silence past threshold", deltas: [] },
  { label: "New Contacts", value: content.contactDetailExtras.contactReportsAll.newContacts, sub: "this quarter", deltas: [] },
  { label: "Response Rate", value: content.contactDetailExtras.contactReportsAll.responseRate, sub: "outbound answered", deltas: [] },
];

export function Contacts() {
  const navigate = useNavigate();
  const { items: contacts } = useCollection<Contact>("contacts");
  const [segment, setSegment] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cols, setCols] = useState<Col[]>(DEFAULT_COLS);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState<string | null>(null);
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const rows = useMemo(() => {
    let list = contacts;
    if (segment !== "all") list = list.filter((c) => c.category === segment);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.relationship, c.location, c.email, c.phone, ...(c.tags ?? [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    for (const col of cols) {
      const f = filters[col.key];
      if (f?.trim()) list = list.filter((c) => col.get(c).toLowerCase().includes(f.toLowerCase()));
    }
    if (sortKey) {
      const col = cols.find((c) => c.key === sortKey);
      if (col) list = [...list].sort((a, b) => col.get(a).localeCompare(col.get(b), undefined, { numeric: true }) * sortDir);
    }
    return list;
  }, [contacts, segment, query, cols, filters, sortKey, sortDir]);

  const grid = { gridTemplateColumns: `1.4fr ${"1fr ".repeat(cols.length - 1)}28px` };
  const addable = EXTRA_COLS.filter((e) => !cols.some((c) => c.key === e.key));

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 1) setSortDir(-1);
      else { setSortKey(null); setSortDir(1); }
    } else { setSortKey(key); setSortDir(1); }
  }

  const [triageDismissed, setTriageDismissed] = useState(false);
  const banner = content.contactDetailExtras.googleSyncBanner;

  return (
    <div className="ct-wrap">
      <div className="ct-report">
        <div className="ct-report-head">
          <span className="ct-report-title">Contacts report</span>
          <span className="ct-report-meta">All · 486 active · relationship health · trend vs. prior period</span>
        </div>
        <div className="ct-report-grid">
          {REPORTS.map((r) => (
            <div className="ct-card" key={r.label}>
              <div className="ct-card-label">{r.label}</div>
              <div className="ct-card-value">{r.value}</div>
              <div className="ct-card-sub">{r.sub}</div>
              {r.deltas.length > 0 && (
                <div className="ct-card-deltas">
                  {r.deltas.map(([p, v]) => {
                    const down = v.startsWith("-");
                    return (
                      <div className="ct-delta" key={p}>
                        <span className="ct-delta-period">{p}</span>
                        <span className="ct-delta-val" style={{ color: down ? "var(--risk)" : "var(--accent)" }}>
                          {down ? "↓" : "↑"} {v}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="ct-tabs">
        <div className="ct-tabs-left">
          <div className="ct-tab active">Directory</div>
          <div className="ct-tab">Queue</div>
          <div className="ct-tab">Inbox →</div>
        </div>
        <span className="ct-count">{rows.length} contacts</span>
      </div>

      {!triageDismissed && (
        <div className="ct-triage">
          <div className="ct-triage-main">
            <div className="ct-triage-head">
              <span className="ct-triage-title">1 new contact synced from Google Contacts</span>
              <span className="ct-triage-tag">needs categorization</span>
            </div>
            <div className="ct-triage-sub">{banner.contact.name} · {banner.contact.email} · {banner.contact.phone} — held outside the pipeline until you classify it</div>
          </div>
          <button className="ct-triage-btn" onClick={() => setTriageDismissed(true)}>Categorize</button>
          <button className="ct-triage-later" onClick={() => setTriageDismissed(true)}>Later</button>
        </div>
      )}

      <div className="ct-controls">
        <input className="ct-search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="ct-segments">
          {SEGMENTS.map((s) => (
            <div key={s.key} className={`ct-segment${segment === s.key ? " active" : ""}`} onClick={() => setSegment(s.key)}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className="ct-table">
        <div className="ct-thead" style={grid}>
          {cols.map((col) => (
            <div className="ct-th" key={col.key}>
              <div className={`ct-th-label${sortKey === col.key ? " sorted" : ""}`} onClick={() => toggleSort(col.key)}>
                {col.label}
                <span className="ct-th-arrow">{sortKey === col.key ? (sortDir === 1 ? "↑" : "↓") : ""}</span>
              </div>
              <button type="button" title="Filter column" className={`ct-th-filter${filters[col.key] ? " on" : ""}`} onClick={() => setFilterOpen(filterOpen === col.key ? null : col.key)}>
                ⌕
              </button>
              {col.removable && (
                <button type="button" title="Remove column" className="ct-th-remove" onClick={() => setCols(cols.filter((c) => c.key !== col.key))}>
                  ×
                </button>
              )}
              {filterOpen === col.key && (
                <div className="ct-filter-pop">
                  <input
                    className="ct-filter-input"
                    autoFocus
                    placeholder={`Filter ${col.label}…`}
                    value={filters[col.key] ?? ""}
                    onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })}
                  />
                  <div className="ct-filter-row">
                    <button type="button" className="ct-filter-clear" onClick={() => setFilters({ ...filters, [col.key]: "" })}>Clear</button>
                    <button type="button" className="ct-filter-done" onClick={() => setFilterOpen(null)}>Done</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="ct-addcol-wrap">
            <button type="button" title="Add column" className="ct-addcol" onClick={() => setColMenuOpen(!colMenuOpen)}>+</button>
            {colMenuOpen && (
              <div className="ct-colmenu">
                <div className="ct-colmenu-head">Add column</div>
                {addable.map((c) => (
                  <div className="ct-colmenu-item" key={c.key} onClick={() => { setCols([...cols, c]); setColMenuOpen(false); }}>
                    {c.label}
                  </div>
                ))}
                {addable.length === 0 && <div className="ct-colmenu-empty">All columns added</div>}
              </div>
            )}
          </div>
        </div>

        {rows.map((c) => (
          <div className="ct-row" style={grid} key={c.id} onClick={() => navigate(`/contact/${c.id}`)}>
            <div className="ct-cell-name">
              <span className="ct-dot" style={{ background: dotFor(c) }} />
              <span className="ct-name" title="Open contact record">{c.name}</span>
            </div>
            {cols.slice(1).map((col) => {
              const cls =
                col.key === "lifetime" ? "ct-cell ink" :
                col.key === "active" ? "ct-cell body" :
                col.key === "lastTouch" ? "ct-cell meta" : "ct-cell";
              return <div className={cls} key={col.key}>{col.get(c)}</div>;
            })}
            <div />
          </div>
        ))}
      </div>
    </div>
  );
}
