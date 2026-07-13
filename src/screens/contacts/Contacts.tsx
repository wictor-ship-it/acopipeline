import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CSSProperties } from "react";
import { useCollection } from "../../data/hooks";
import { recordAction, bulkImport, newId, mergeContacts } from "../../data/repository";
import { useAppState } from "../../app/state";
import { fetchGoogleContacts, ReconnectNeeded } from "../../data/adapters/googleContacts";
import type { Contact, Opportunity } from "../../domain/types";
import {
  BASE_COLS, CONTACT_TASKS, CONTACT_TOUCHES, deltaCell, EXTRA_COL_DEFS,
  GC_BANNER, REL_DATA, SANS, SEG_KEY, SEGMENTS, TOUCH_QUEUE, type QueueItem,
} from "./data";
import "./Contacts.css";

/* ================= SCREEN · CONTACTS DIRECTORY (fragment 07) ================= */

const parseMoney = (s: string) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0; return /M/i.test(s) ? n * 1e6 : /K/i.test(s) ? n * 1e3 : n; };

function colValue(c: Contact, key: string): string {
  switch (key) {
    case "name": return c.name;
    case "relationship": return c.relationship ?? "";
    case "location": return c.location ?? "";
    case "active": return c.active_deals ?? "";
    case "lifetime": return c.lifetime_gci ?? "";
    case "lastTouch": return c.last_touch ?? "";
    case "tags": return (c.tags ?? []).join(" · ") || "—";
    case "status": return c.status;
    case "phone": return c.phone ?? "";
    case "email": return c.email ?? "";
    case "since": return c.since ?? "";
    case "dealsWon": return c.deals_won ?? "";
    case "category": return c.category;
    case "prefAsset": return (c.preferences?.asset as string) ?? "—";
    case "prefBudget": return (c.preferences?.budget as string) ?? "—";
    default: return "";
  }
}
function sortVal(c: Contact, key: string): string | number {
  if (key === "active") return parseFloat(c.active_deals ?? "0") || 0;
  if (key === "lifetime") return parseMoney(c.lifetime_gci ?? "");
  if (key === "lastTouch") { const d = Date.parse((c.last_touch ?? "") + " 2026"); return isNaN(d) ? 0 : d; }
  return colValue(c, key).toLowerCase();
}

/* Duplicate detection — cluster contacts that share an email, phone, or name
   (union-find). Returns only groups of 2+. CRM-side hygiene, never touches Google. */
function findDuplicateClusters(contacts: Contact[]): Contact[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; while (parent.get(x) !== r) { const n = parent.get(x)!; parent.set(x, r); x = n; } return r; };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const c of contacts) parent.set(c.id, c.id);
  const linkBy = (keyOf: (c: Contact) => string) => {
    const m = new Map<string, string[]>();
    for (const c of contacts) { const k = keyOf(c); if (!k) continue; const a = m.get(k) ?? []; a.push(c.id); m.set(k, a); }
    for (const ids of m.values()) for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  };
  // Guard each key against junk/partial values (masked seed data, short numbers)
  // so we never cluster on a non-identifying fragment.
  linkBy((c) => { const e = (c.email ?? "").toLowerCase().trim(); return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : ""; });
  linkBy((c) => { const d = (c.phone ?? "").replace(/\D/g, ""); return d.length >= 7 ? d : ""; });
  linkBy((c) => { const n = (c.name ?? "").toLowerCase().replace(/\s+/g, " ").trim(); return n.length >= 3 ? n : ""; });
  const groups = new Map<string, Contact[]>();
  for (const c of contacts) { const r = find(c.id); const a = groups.get(r) ?? []; a.push(c); groups.set(r, a); }
  return [...groups.values()].filter((g) => g.length > 1);
}

/* The record kept on merge — the one with the most filled fields (tiebreak: has
   an email, then more relationship data). */
function pickPrimary(cluster: Contact[]): Contact {
  const score = (c: Contact) => Object.values(c).filter((v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)).length + (c.email ? 2 : 0);
  return [...cluster].sort((a, b) => score(b) - score(a))[0];
}

export function Contacts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items: contacts, loading: contactsLoading } = useCollection<Contact>("contacts");
  const { items: opportunities } = useCollection<Opportunity>("opportunities");
  const { google } = useAppState();

  /* Google Contacts import — pull all, dedupe by email/phone against the
     directory, create the new ones in one audited batch (Undo removes them). */
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  // Normalized phone for dedup — only ≥7 digits counts as an identifying key.
  const normPhone = (p?: string) => { const d = (p ?? "").replace(/\D/g, ""); return d.length >= 7 ? d : ""; };

  /* Duplicate detection + merge suggestions (CRM-side hygiene). */
  const [dupOpen, setDupOpen] = useState(false);
  const [mergeMsg, setMergeMsg] = useState<string | null>(null);
  const dupClusters = useMemo(() => findDuplicateClusters(contacts), [contacts]);
  const doMerge = async (cluster: Contact[]) => {
    const primary = pickPrimary(cluster);
    const others = cluster.filter((c) => c.id !== primary.id).map((c) => c.id);
    if (!others.length) return;
    await mergeContacts(primary.id, others, { actor: "user", action: `Merged ${others.length + 1} duplicate contacts → ${primary.name}` });
    setMergeMsg(`Merged ${others.length + 1} into ${primary.name}. References repointed · Undo available.`);
  };
  const importGoogle = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const gcs = await fetchGoogleContacts();
      if (gcs === null) { setImportMsg("Couldn't reach Google — reconnect in Settings."); return; }
      const haveEmail = new Set(contacts.map((c) => (c.email ?? "").toLowerCase()).filter(Boolean));
      const havePhone = new Set(contacts.map((c) => normPhone(c.phone)).filter(Boolean));
      const seen = new Set<string>();
      const toImport: Contact[] = [];
      for (const g of gcs) {
        const email = (g.email ?? "").toLowerCase();
        const phone = normPhone(g.phone);
        const key = email || phone || g.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        if (email && haveEmail.has(email)) continue;
        if (!email && phone && havePhone.has(phone)) continue;
        toImport.push({
          id: newId("ct"), name: g.name, category: "sphere", status: "SPHERE", language: ["EN"],
          email: g.email, phone: g.phone, company: g.company, title: g.title,
          birthday: g.birthday, location: g.location, linkedin: g.linkedin, source: "Google Contacts",
        });
      }
      if (!toImport.length) { setImportMsg("No new contacts — your directory is already up to date."); return; }
      await bulkImport("contacts", toImport, { actor: "user", action: `Imported ${toImport.length} contact${toImport.length === 1 ? "" : "s"} from Google Contacts` });
      const skipped = gcs.length - toImport.length;
      setImportMsg(`Imported ${toImport.length} contact${toImport.length === 1 ? "" : "s"}${skipped > 0 ? ` · ${skipped} skipped (duplicates)` : ""}.`);
    } catch (e) {
      setImportMsg(e instanceof ReconnectNeeded ? "Reconnect Google with Contacts access in Settings." : "Import failed — please try again.");
    } finally {
      setImporting(false);
    }
  };

  const [view, setView] = useState<"directory" | "queue">(searchParams.get("view") === "queue" ? "queue" : "directory");
  const [seg, setSeg] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState<string | null>(null);
  const [extraCols, setExtraCols] = useState<string[]>([]);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSel, setTagSel] = useState("all");
  const [peekId, setPeekId] = useState<string | null>(null);
  const [gcHidden, setGcHidden] = useState(false);
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});

  /* queue state */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [snoozed, setSnoozed] = useState<Record<string, string | undefined>>({});
  const [briefOpen, setBriefOpen] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [waSel, setWaSel] = useState<Record<string, boolean>>({});

  // Report bar computed from the ACTUAL contacts (not demo constants). Metrics we
  // don't track yet (touch cadence, replies, 30-day intake) show "—" rather than
  // fabricated numbers; trends stay "—" until we snapshot history.
  const relKey = SEG_KEY[seg] ?? "all";
  const segLabel = (REL_DATA[relKey] ?? REL_DATA.all).label;
  const segContacts = contacts.filter((c) => seg === "all" || c.category === seg);
  const activeCount = segContacts.filter((c) => c.status !== "PAST").length;
  const atRiskCount = segContacts.filter((c) => c.status === "SLIPPING").length;
  const NA = { v: "—", d30: "—", dQ: "—", dY: "—" };
  const num = (n: number) => ({ v: String(n), d30: "—", dQ: "—", dY: "—" });
  const reports = [
    { label: "Active Contacts", sub: "in segment", m: num(activeCount), inv: false },
    { label: "Touch Compliance", sub: "cadence on time", m: NA, inv: false },
    { label: "At-Risk", sub: "status slipping", m: num(atRiskCount), inv: true },
    { label: "New Contacts", sub: "added · 30 days", m: NA, inv: false },
    { label: "Response Rate", sub: "outreach replied", m: NA, inv: false },
  ];
  const reportMeta = `${segLabel} · ${activeCount} active · relationship health`;

  /* tag chips — top 9 by count within seg */
  const tagChips = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) if (seg === "all" || c.category === seg) for (const t of c.tags ?? []) counts[t] = (counts[t] ?? 0) + 1;
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 9).map((t) => ({ label: `${t} · ${counts[t]}`, id: t }));
    return [{ label: "All tags", id: "all" }, ...top];
  }, [contacts, seg]);

  const activeExtraDefs = EXTRA_COL_DEFS.filter(([, k]) => extraCols.includes(k));
  const allCols = [...BASE_COLS, ...activeExtraDefs];
  const colMenuItems = EXTRA_COL_DEFS.filter(([, k]) => !extraCols.includes(k));

  const rows = useMemo(() => {
    let list = contacts.filter((c) => (seg === "all" || c.category === seg) && (tagSel === "all" || (c.tags ?? []).includes(tagSel)));
    if (search.trim()) { const q = search.trim().toLowerCase(); list = list.filter((c) => (c.name + " " + (c.relationship ?? "") + " " + (c.location ?? "")).toLowerCase().includes(q)); }
    list = list.filter((c) => allCols.every(([, k]) => { const f = (filters[k] ?? "").trim().toLowerCase(); return !f || colValue(c, k).toLowerCase().includes(f); }));
    list = [...list].sort((a, b) => { const va = sortVal(a, sortKey), vb = sortVal(b, sortKey); const r = va < vb ? -1 : va > vb ? 1 : 0; return sortDir === "asc" ? r : -r; });
    return list;
  }, [contacts, seg, tagSel, search, filters, allCols, sortKey, sortDir]);

  const gridStyle: CSSProperties = { minWidth: 940, gridTemplateColumns: `1.6fr 1.3fr 1.2fr 0.7fr 1fr 0.9fr${" 1.1fr".repeat(extraCols.length)} 40px` };

  const toggleSort = (key: string) => { if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(key); setSortDir("asc"); } };

  /* ---- queue derived ---- */
  const isActive = (q: QueueItem) => !touched[q.id] && !snoozed[q.id];
  const plannedMin = TOUCH_QUEUE.filter(isActive).reduce((s, q) => s + q.min, 0);
  const doneMin = TOUCH_QUEUE.filter((q) => touched[q.id]).reduce((s, q) => s + q.min, 0);
  const defended = TOUCH_QUEUE.filter((q) => touched[q.id]).reduce((s, q) => s + (parseFloat((q.wgci || "").replace(/[^0-9.]/g, "")) || 0), 0);
  const openCount = TOUCH_QUEUE.filter(isActive).length;
  const doneCount = TOUCH_QUEUE.filter((q) => touched[q.id]).length;
  const budgetLine = `Attention budget · ${plannedMin} min planned`;
  const defendedLine = defended > 0 ? `Defended today · $${Math.round(defended)}K weighted GCI in ${doneMin} min` : "Nothing touched yet — the queue is worth $1.39M weighted";
  const allDone = TOUCH_QUEUE.every((q) => !isActive(q));
  const waSelectable = (q: QueueItem) => q.channel === "WhatsApp" && isActive(q) && !sent[q.id];

  const groups = (["Call", "WhatsApp", "Field"] as const).map((ch) => {
    const list = TOUCH_QUEUE.filter((q) => q.channel === ch);
    if (!list.length) return null;
    const mins = list.filter(isActive).reduce((s, q) => s + q.min, 0);
    const isWa = ch === "WhatsApp";
    const waRows = isWa ? list.filter(waSelectable) : [];
    const selRows = waRows.filter((q) => waSel[q.id]);
    return { ch, label: ch === "Call" ? "Calls" : ch === "WhatsApp" ? "WhatsApp · approve & send" : "Field", mins: `${mins} min`, rows: list, isWa: isWa && waRows.length > 0, waRows, selRows };
  }).filter(Boolean) as Array<{ ch: string; label: string; mins: string; rows: QueueItem[]; isWa: boolean; waRows: QueueItem[]; selRows: QueueItem[] }>;

  const logTouch = (q: QueueItem) => { const was = !!touched[q.id]; setTouched((p) => ({ ...p, [q.id]: !p[q.id] })); void recordAction({ actor: "user", action: `Queue · logged touch — ${q.name}` }, `contact/${q.id}`, () => setTouched((p) => ({ ...p, [q.id]: was }))); };
  const send = (q: QueueItem, how: "WhatsApp" | "Email") => {
    const label = how === "WhatsApp" ? "Sent · WhatsApp · queued to clipboard" : "Sent · Email · via Gmail";
    const wasSent = sent[q.id]; const wasTouched = !!touched[q.id];
    setSent((p) => ({ ...p, [q.id]: label })); setTouched((p) => ({ ...p, [q.id]: true }));
    void recordAction({ actor: "user", skill: "senior_advisor", action: `Queue · draft sent via ${how} — ${q.name}` }, `contact/${q.id}`, () => { setSent((p) => ({ ...p, [q.id]: wasSent })); setTouched((p) => ({ ...p, [q.id]: wasTouched })); });
  };
  const bulkApprove = (list: QueueItem[], how: string) => {
    if (!list.length) return;
    const prevSent = { ...sent }, prevTouched = { ...touched };
    const ns = { ...sent }, nt = { ...touched };
    list.forEach((q) => { ns[q.id] = "Sent · WhatsApp · queued to clipboard"; nt[q.id] = true; });
    setSent(ns); setTouched(nt); setWaSel({});
    void recordAction({ actor: "user", skill: "senior_advisor", action: `Queue · WhatsApp batch approved (${how}) — ${list.length} draft(s) sent 1:1, each in the contact language` }, "queue", () => { setSent(prevSent); setTouched(prevTouched); });
  };
  /* Log every active touch in a channel (Call/Field) in one move. */
  const bulkLog = (list: QueueItem[], label: string) => {
    if (!list.length) return;
    const prev = { ...touched };
    const nt = { ...touched };
    list.forEach((q) => { nt[q.id] = true; });
    setTouched(nt);
    void recordAction({ actor: "user", action: `Queue · ${label} logged in batch — ${list.length} touch(es)` }, "queue", () => setTouched(prev));
  };
  /* One-tap day: send every sendable WhatsApp draft + log the rest. */
  const approveDay = () => {
    const wa = TOUCH_QUEUE.filter((q) => q.channel === "WhatsApp" && isActive(q) && !sent[q.id]);
    const rest = TOUCH_QUEUE.filter((q) => q.channel !== "WhatsApp" && isActive(q));
    if (!wa.length && !rest.length) return;
    const prevSent = { ...sent }, prevTouched = { ...touched };
    const ns = { ...sent }, nt = { ...touched };
    wa.forEach((q) => { ns[q.id] = "Sent · WhatsApp · queued to clipboard"; nt[q.id] = true; });
    rest.forEach((q) => { nt[q.id] = true; });
    setSent(ns); setTouched(nt); setWaSel({});
    void recordAction({ actor: "user", skill: "senior_advisor", action: `Touch Today · approved the day — ${wa.length} draft(s) sent, ${rest.length} touch(es) logged` }, "queue", () => { setSent(prevSent); setTouched(prevTouched); });
  };

  const gcCategorize = () => { setGcHidden(true); void recordAction({ actor: "user", skill: "compliance", action: `Google sync · categorized — ${GC_BANNER.name}` }, "contact/isabela", () => setGcHidden(false)); };

  const peek = peekId ? contacts.find((c) => c.id === peekId) : null;
  const peekDeals = peek ? opportunities.filter((o) => o.contact_id === peek.id) : [];
  const peekTasks = peek ? (CONTACT_TASKS[peek.id] ?? []) : [];
  const peekTouches = peek ? (CONTACT_TOUCHES[peek.id] ?? []) : [];
  const net = peek?.pinned as undefined | { got?: string; gave?: string; bal?: string; balColor?: string; move?: string; slaLine?: string };
  const prefs = peek?.preferences as undefined | { asset?: string; areas?: string; budget?: string };

  return (
    <div style={{ padding: "0 48px 140px" }}>
      {/* CONTACTS REPORT BAR */}
      <div style={{ margin: "18px 0 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D" }}>Contacts report</span>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{reportMeta}</span>
        </div>
        <div className="ct-reportgrid">
          {reports.map((r) => (
            <div key={r.label} className="ct-reportcard">
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", whiteSpace: "nowrap" }}>{r.label}</div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 28, lineHeight: 1, marginTop: 12, color: "#0D0D0D" }}>{r.m.v}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.01em", color: "#B8B8B8", marginTop: 5 }}>{r.sub}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 14, borderTop: "1px solid #E3E3E3", paddingTop: 12 }}>
                {[deltaCell("30 D", r.m.d30, r.inv), deltaCell("QTR", r.m.dQ, r.inv), deltaCell("1 YR", r.m.dY, r.inv)].map((d) => (
                  <div key={d.period} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B8B8B8" }}>{d.period}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, color: d.color }}>{d.disp}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* view tabs */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "22px 0 0", borderBottom: "1px solid #E3E3E3" }}>
        <div style={{ display: "flex", gap: 30 }}>
          {([["Directory", "directory"], ["Queue", "queue"]] as const).map(([label, id]) => (
            <div key={id} onClick={() => setView(id)} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: view === id ? "#0D0D0D" : "#8F8F8F", paddingBottom: 8, borderBottom: `1px solid ${view === id ? "#0D0D0D" : "transparent"}`, cursor: "pointer", transition: "color 150ms" }}>{label}</div>
          ))}
          <div onClick={() => navigate("/inbox")} className="ct-inboxlink" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8F8F8F", paddingBottom: 8, cursor: "pointer", transition: "color 150ms" }}>Inbox →</div>
        </div>
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>{contactsLoading && rows.length === 0 ? "Loading…" : `${rows.length} contacts`}</span>
      </div>

      {/* GOOGLE CONTACTS SYNC · TRIAGE BANNER (mock — demo only; real import is
          the toolbar button below when Google is connected) */}
      {!gcHidden && !google.connected && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, border: "1px solid #E3E3E3", borderLeft: "2px solid #D0342C", background: "rgba(255,255,255,0.55)", padding: "14px 18px", marginTop: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: "#0D0D0D" }}>1 new contact synced from Google Contacts</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F" }}>needs categorization</span>
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#5D5D5D", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{GC_BANNER.line}</div>
          </div>
          <button onClick={gcCategorize} className="ct-btn-solid" style={{ flex: "none", background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 150ms" }}>Categorize</button>
          <span onClick={() => setGcHidden(true)} className="ct-later" style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", border: "1px solid #E3E3E3", padding: "7px 13px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 150ms" }}>Later</span>
        </div>
      )}

      {view === "queue" && (
        <QueueView
          groups={groups} openCount={openCount} doneCount={doneCount} budgetLine={budgetLine} defendedLine={defendedLine}
          allDone={allDone} touched={touched} snoozed={snoozed} sent={sent} waSel={waSel} briefOpen={briefOpen}
          isActive={isActive} waSelectable={waSelectable}
          onBrief={(id) => setBriefOpen((o) => (o === id ? null : id))}
          onLog={logTouch} onSend={send} onBulk={bulkApprove} onBulkLog={bulkLog} onApproveDay={approveDay}
          onSnooze={(q, day) => setSnoozed((p) => ({ ...p, [q.id]: p[q.id] ? undefined : day }))}
          onWaSel={(id) => setWaSel((p) => ({ ...p, [id]: !p[id] }))}
        />
      )}

      {view === "directory" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "22px 0 16px" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="ct-search" style={{ width: 180, background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D", padding: "6px 0", outline: "none" }} />
            <div style={{ display: "flex", gap: "14px 26px", flexWrap: "wrap" }}>
              {SEGMENTS.map(([label, id]) => (
                <div key={id} onClick={() => setSeg(id)} onMouseEnter={() => setSeg(id)} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: seg === id ? "#0D0D0D" : "#8F8F8F", paddingBottom: 5, borderBottom: `1px solid ${seg === id ? "#0D0D0D" : "transparent"}`, cursor: "pointer", transition: "color 150ms" }}>{label}</div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            {google.connected && (
              <button onClick={importGoogle} disabled={importing} className="ct-btn-outline" style={{ flex: "none", background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 15px", fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: importing ? "#8F8F8F" : "#0D0D0D", cursor: importing ? "default" : "pointer", whiteSpace: "nowrap", transition: "all 150ms" }}>{importing ? "Importing…" : "Import from Google"}</button>
            )}
            <div onClick={() => setTagsOpen((o) => !o)} onMouseEnter={() => setTagsOpen(true)} className="ct-later" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8F8F8F", cursor: "pointer", whiteSpace: "nowrap", paddingBottom: 5, transition: "color 150ms" }}>{tagSel !== "all" ? `Tags · ${tagSel}` : "Tags"} {tagsOpen ? "⌃" : "⌄"}</div>
          </div>
          {importMsg && (
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#10A37F", padding: "0 0 12px" }}>{importMsg}</div>
          )}

          {/* DUPLICATE DETECTION · merge suggestions (CRM-side; never touches Google) */}
          {dupClusters.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="ct-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 18px", borderLeft: "2px solid #10A37F" }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: "#0D0D0D" }}>{dupClusters.length} possible duplicate group{dupClusters.length === 1 ? "" : "s"}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", marginLeft: 10 }}>same email, phone, or name</span>
                </div>
                <button onClick={() => setDupOpen((o) => !o)} className="ct-btn-outline" style={{ flex: "none", background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 15px", fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", whiteSpace: "nowrap", transition: "all 150ms" }}>{dupOpen ? "Hide" : "Review"}</button>
              </div>
              {mergeMsg && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#10A37F", padding: "8px 2px 0" }}>{mergeMsg}</div>}
              {dupOpen && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  {dupClusters.map((cluster, i) => {
                    const primary = pickPrimary(cluster);
                    return (
                      <div key={i} className="ct-card" style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12.5, color: "#0D0D0D" }}>{cluster.length} records look like the same person</span>
                          <button onClick={() => void doMerge(cluster)} className="ct-btn-solid" style={{ flex: "none", background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 15px", fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 150ms" }}>Merge · keep {primary.name.split(" ")[0]}</button>
                        </div>
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                          {cluster.map((c) => (
                            <div key={c.id} style={{ display: "flex", alignItems: "baseline", gap: 10, fontFamily: SANS, fontSize: 12.5, flexWrap: "wrap" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", flex: "none", background: c.id === primary.id ? "#10A37F" : "#D9D9D9", alignSelf: "center" }} />
                              <span style={{ fontWeight: c.id === primary.id ? 600 : 400, color: "#0D0D0D" }}>{c.name}</span>
                              <span style={{ color: "#8F8F8F", minWidth: 0 }}>{[c.email, c.phone, c.company].filter(Boolean).join(" · ") || "—"}</span>
                              {c.id === primary.id && <span style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10A37F" }}>keep</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tagsOpen && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 0 20px" }}>
              {tagChips.map((tg) => (
                <div key={tg.id} onClick={() => setTagSel(tg.id)} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, letterSpacing: "0.02em", color: tagSel === tg.id ? "#0D0D0D" : "#5D5D5D", background: tagSel === tg.id ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${tagSel === tg.id ? "#0D0D0D" : "#D9D9D9"}`, borderRadius: 999, padding: "6px 13px", cursor: "pointer", transition: "all 150ms" }}>{tg.label}</div>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid #E3E3E3" }}>
            {/* header */}
            <div style={{ display: "grid", ...gridStyle, padding: "13px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "center", background: "rgba(255,255,255,0.55)" }}>
              {allCols.map(([label, key]) => {
                const removable = extraCols.includes(key);
                const filterActive = (filters[key] ?? "").trim() !== "";
                return (
                  <div key={key} style={{ position: "relative", display: "flex", alignItems: "center", gap: 5 }}>
                    <div onClick={() => toggleSort(key)} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: sortKey === key ? "#0D0D0D" : "#8F8F8F", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>{label}<span style={{ fontSize: 9, lineHeight: 1 }}>{sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}</span></div>
                    <span onClick={() => setFilterOpen((o) => (o === key ? null : key))} title="Filter column" className="ct-filter-icon" style={{ fontFamily: SANS, fontSize: 11, lineHeight: 1, color: filterActive ? "#0D0D0D" : "#8F8F8F", border: `0.5px solid ${filterActive ? "#0D0D0D" : "transparent"}`, padding: "2px 4px", cursor: "pointer", transition: "color 150ms" }}>⌕</span>
                    {removable && <span onClick={() => { setExtraCols((cs) => cs.filter((k) => k !== key)); setFilterOpen(null); }} title="Remove column" className="ct-remove" style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1, color: "#B8B8B8", cursor: "pointer", padding: "2px 2px", transition: "color 150ms" }}>×</span>}
                    {filterOpen === key && (
                      <div style={{ position: "absolute", left: 0, top: 28, zIndex: 50, borderRadius: 12, background: "rgba(255,255,255,0.42)", backdropFilter: "blur(22px) saturate(1.7)", WebkitBackdropFilter: "blur(22px) saturate(1.7)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 14px 34px rgba(0,0,0,0.14)", padding: "12px 14px", minWidth: 190, display: "flex", flexDirection: "column", gap: 8 }}>
                        <input value={filters[key] ?? ""} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))} placeholder={`Filter ${label}…`} style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3", padding: "5px 0", fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#0D0D0D", outline: "none" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span onClick={() => { setFilters((f) => ({ ...f, [key]: "" })); setFilterOpen(null); }} className="ct-clear" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", cursor: "pointer" }}>Clear</span>
                          <span onClick={() => setFilterOpen(null)} className="ct-later" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Done</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ position: "relative", justifySelf: "end" }}>
                <div onClick={() => setColMenuOpen((o) => !o)} title="Add column" className="ct-addcol" style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #D9D9D9", borderRadius: 6, color: "#8F8F8F", fontFamily: SANS, fontWeight: 400, fontSize: 14.5, lineHeight: 1, cursor: "pointer", transition: "all 150ms" }}>+</div>
                {colMenuOpen && (
                  <div style={{ position: "absolute", right: 0, top: 30, zIndex: 40, minWidth: 190, background: "rgba(255,255,255,0.62)", border: "1px solid #D9D9D9" }}>
                    <div style={{ padding: "11px 16px 9px", borderBottom: "1px solid #E3E3E3", fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Add column</div>
                    {colMenuItems.map(([label, key]) => (
                      <div key={key} onClick={() => { setExtraCols((cs) => [...cs, key]); setColMenuOpen(false); }} className="ct-menu-item" style={{ padding: "11px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030", cursor: "pointer", transition: "background 150ms", borderBottom: "1px solid #E3E3E3" }}>{label}</div>
                    ))}
                    {colMenuItems.length === 0 && <div style={{ padding: "11px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>All columns added</div>}
                  </div>
                )}
              </div>
            </div>
            {/* rows */}
            {rows.map((c) => (
              <div key={c.id} onClick={() => setPeekId(c.id)} className="ct-row" style={{ display: "grid", ...gridStyle, padding: "18px 4px", borderBottom: "1px solid #E3E3E3", alignItems: "center", cursor: "pointer", transition: "background 150ms" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot ?? "#8F8F8F", flex: "none", marginTop: 6 }} />
                  <div><span onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${c.id}`); }} title="Open contact record" className="ct-name" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", cursor: "pointer" }}>{c.name}</span></div>
                </div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{c.relationship}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{c.location}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>{c.active_deals}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{c.lifetime_gci}</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F" }}>{c.last_touch}</div>
                {extraCols.map((k) => (
                  <div key={k} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{colValue(c, k)}</div>
                ))}
                <div />
              </div>
            ))}
            {rows.length === 0 && (
              <div style={{ padding: "44px 4px", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", textAlign: "center" }}>
                {contactsLoading ? "Loading contacts…" : "No contacts yet — use “Import from Google” above, or add one."}
              </div>
            )}
          </div>
        </>
      )}

      {/* PEEK DRAWER */}
      {peek && (
        <>
          <div onClick={() => setPeekId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 80 }} />
          <div className="ct-peek">
            <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid #E3E3E3" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8F8F8F" }}>{peek.relationship} · {peek.location}</span>
                <span onClick={() => setPeekId(null)} className="ct-peek-x" style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E3E3E3", borderRadius: 8, fontFamily: SANS, fontSize: 13, color: "#8F8F8F", cursor: "pointer", transition: "all 150ms" }}>×</span>
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 22, letterSpacing: "-0.01em", color: "#0D0D0D", marginTop: 8 }}>{peek.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: peek.dot ?? "#8F8F8F" }} />
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}>{peek.status}</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #E3E3E3" }}>
                {[{ l: "Lifetime GCI", v: peek.lifetime_gci }, { l: "Active deals", v: peek.active_deals }, { l: "Last touch", v: peek.last_touch }].map((n, i) => (
                  <div key={n.l} style={{ padding: "16px 0 16px 28px", borderRight: i < 2 ? "1px solid #E3E3E3" : "none" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>{n.l}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 19, color: "#0D0D0D", marginTop: 5 }}>{n.v}</div>
                  </div>
                ))}
              </div>
              {peek.agent_note && (
                <div style={{ padding: "16px 28px", borderBottom: "1px solid #E3E3E3", borderLeft: "2px solid #0D0D0D", background: "rgba(255,255,255,0.55)" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5D5D5D" }}>Agent note</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: "#303030", marginTop: 6 }}>{peek.agent_note}</div>
                </div>
              )}
              <div style={{ padding: "18px 28px", borderBottom: "1px solid #E3E3E3" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}>Open tasks</span>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>{peekTasks.filter((_, i) => !doneTasks[`${peek.id}-t${i}`]).length} open</span>
                </div>
                {peekTasks.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.6, color: "#8F8F8F" }}>Nothing open — the agent queues the next touch automatically.</div>}
                {peekTasks.map((t, i) => { const tid = `${peek.id}-t${i}`; const done = !!doneTasks[tid]; return (
                  <div key={tid} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <div onClick={() => setDoneTasks((p) => ({ ...p, [tid]: !p[tid] }))} style={{ width: 13, height: 13, flex: "none", border: "1px solid #D9D9D9", borderRadius: 4, background: done ? "#0D0D0D" : "transparent", cursor: "pointer", transition: "background 150ms" }} />
                    <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 400, fontSize: 13, color: done ? "#8F8F8F" : "#0D0D0D", textDecoration: done ? "line-through" : "none" }}>{t.t}</span>
                    <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F" }}>{t.due}</span>
                  </div>
                ); })}
              </div>
              {net?.got && (
                <div style={{ padding: "18px 28px", borderBottom: "1px solid #E3E3E3" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Reciprocity ledger</div>
                  {[{ l: "They sent", v: net.got, c: "#303030" }, { l: "You sent", v: net.gave, c: "#303030" }, { l: "Balance", v: net.bal, c: net.balColor ?? "#303030" }, { l: "Suggested move", v: net.move, c: "#303030" }, ...(net.slaLine ? [{ l: "SLA", v: net.slaLine, c: "#303030" }] : [])].map((r) => (
                    <div key={r.l} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8F8F8F", flex: "none" }}>{r.l}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: r.c, textAlign: "right" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {prefs?.asset && (
                <div style={{ padding: "18px 28px", borderBottom: "1px solid #E3E3E3" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Search profile</div>
                  {[{ l: "Asset", v: prefs.asset }, { l: "Areas", v: prefs.areas }, { l: "Budget", v: prefs.budget }].map((p) => (
                    <div key={p.l} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8F8F8F" }}>{p.l}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030", textAlign: "right" }}>{p.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {peekDeals.length > 0 && (
                <div style={{ padding: "18px 28px", borderBottom: "1px solid #E3E3E3" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Open deals</div>
                  {peekDeals.map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <div>
                        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{d.name}</div>
                        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 2 }}>{d.stage}</div>
                      </div>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{d.budget}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: "18px 28px 24px" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 10 }}>Recent touches</div>
                {peekTouches.slice(0, 4).map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "7px 0" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", flex: "none", width: 46 }}>{a.date}</span>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5D5D5D" }}>{a.type}</span>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: "#303030", marginTop: 2 }}>{a.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "16px 28px", borderTop: "1px solid #E3E3E3", background: "rgba(255,255,255,0.62)" }}>
              <button onClick={() => { setPeekId(null); navigate(`/contacts/${peek.id}`); }} className="ct-btn-solid" style={{ flex: 1, background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "11px 0", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "opacity 150ms" }}>Open full record</button>
              <button onClick={() => { setPeekId(null); navigate("/activities"); }} className="ct-btn-outline" style={{ flex: 1, background: "transparent", border: "1px solid #E3E3E3", padding: "11px 0", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "all 150ms" }}>Log activity</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Touch Today queue view ---------------- */
interface QueueViewProps {
  groups: Array<{ ch: string; label: string; mins: string; rows: QueueItem[]; isWa: boolean; waRows: QueueItem[]; selRows: QueueItem[] }>;
  openCount: number; doneCount: number; budgetLine: string; defendedLine: string; allDone: boolean;
  touched: Record<string, boolean>; snoozed: Record<string, string | undefined>; sent: Record<string, string>; waSel: Record<string, boolean>; briefOpen: string | null;
  isActive: (q: QueueItem) => boolean; waSelectable: (q: QueueItem) => boolean;
  onBrief: (id: string) => void; onLog: (q: QueueItem) => void; onSend: (q: QueueItem, how: "WhatsApp" | "Email") => void;
  onBulk: (list: QueueItem[], how: string) => void; onBulkLog: (list: QueueItem[], label: string) => void; onApproveDay: () => void; onSnooze: (q: QueueItem, day: string) => void; onWaSel: (id: string) => void;
}
function QueueView(p: QueueViewProps) {
  /* Keyboard processing: ↑↓/jk navigate active rows · ⏎ act (send WhatsApp / log
     the rest) · S snooze · A approve the day. Mirrors the Act Now queue. */
  const navRows = p.groups.flatMap((g) => g.rows.filter((r) => p.isActive(r)));
  const [focusIdx, setFocusIdx] = useState(0);
  useEffect(() => { setFocusIdx((f) => Math.min(f, Math.max(0, navRows.length - 1))); }, [navRows.length]);
  const focusedId = navRows[focusIdx]?.id;
  const actFocused = () => { const q = navRows[focusIdx]; if (!q) return; if (q.channel === "WhatsApp" && !p.sent[q.id]) p.onSend(q, "WhatsApp"); else p.onLog(q); };
  const snoozeFocused = () => { const q = navRows[focusIdx]; if (q) p.onSnooze(q, "Tue"); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (navRows.length === 0) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); setFocusIdx((f) => Math.min(f + 1, navRows.length - 1)); }
      else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); setFocusIdx((f) => Math.max(f - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); actFocused(); }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); snoozeFocused(); }
      else if (e.key === "a" || e.key === "A") { e.preventDefault(); p.onApproveDay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navRows, focusIdx]);
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "30px 0 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Touch Today</span>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, fontStyle: "italic", color: "#5D5D5D" }}>ranked by return per minute</span>
          {p.openCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.03em", color: "#B8B8B8" }}>
              <span className="ct-kbd">↑↓</span> move<span className="ct-kbd">⏎</span> act<span className="ct-kbd">S</span> snooze<span className="ct-kbd">A</span> day
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{p.openCount} open · {p.doneCount} touched</span>
          {p.openCount > 0 && <button onClick={p.onApproveDay} className="ct-btn-solid" style={{ background: "#0D0D0D", border: "1px solid #0D0D0D", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#FFFFFF", cursor: "pointer" }}>Approve the day · {p.openCount}</button>}
        </div>
      </div>
      <div className="ct-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "12px 18px", marginBottom: 16 }}>
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.04em", color: "#5D5D5D" }}>{p.budgetLine}</span>
        <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, letterSpacing: "0.04em", color: "#0D0D0D" }}>{p.defendedLine}</span>
      </div>
      {p.allDone && (
        <div style={{ border: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)", padding: "28px 32px", marginBottom: 14 }}>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#0D0D0D" }}>Queue clear.</div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.6, color: "#5D5D5D", marginTop: 6 }}>Every relationship touched on schedule. The agent resets the clocks overnight — tomorrow's queue arrives with the 6 AM brief.</div>
        </div>
      )}
      <div style={{ borderTop: "1px solid #E3E3E3" }}>
        {p.groups.map((g) => {
          let rank = 0;
          const logRows = g.rows.filter((r) => p.isActive(r));
          return (
            <div key={g.ch}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5D5D5D" }}>{g.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {g.selRows.length > 0 && <button onClick={() => p.onBulk(g.selRows, "selected")} className="ct-btn-solid" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "6px 13px", fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Approve selected · {g.selRows.length}</button>}
                  {g.isWa && <button onClick={() => p.onBulk(g.waRows, "all remaining")} className="ct-btn-outline-dark" style={{ background: "transparent", border: "1px solid #0D0D0D", borderRadius: 999, padding: "6px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Approve all</button>}
                  {!g.isWa && logRows.length > 0 && <button onClick={() => p.onBulkLog(logRows, g.label)} className="ct-btn-outline-dark" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "6px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Log all · {logRows.length}</button>}
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8F8F8F" }}>{g.mins}</span>
                </div>
              </div>
              {g.rows.map((q) => {
                const globalRank = ++rank; void globalRank;
                const active = p.isActive(q); const done = !!p.touched[q.id]; const snz = p.snoozed[q.id];
                const dot = !active ? "#8F8F8F" : q.overdue ? "#D0342C" : q.status === "HOT" ? "#0D0D0D" : "#8F8F8F";
                const clockColor = !active ? "#8F8F8F" : q.overdue ? "#D0342C" : "#5D5D5D";
                const modeChip = q.mode === "You" ? "YOU" : q.mode === "Assisted" ? "ASSISTED" : "AGENT-RUN";
                const modeColor = q.mode === "You" ? "#0D0D0D" : "#8F8F8F";
                const idx = TOUCH_QUEUE.findIndex((x) => x.id === q.id);
                const showDraftLine = !!q.brief.draft && q.channel === "WhatsApp" && active && !p.sent[q.id];
                const selectable = p.waSelectable(q);
                return (
                  <div key={q.id} style={{ borderBottom: "1px solid #E3E3E3", borderLeft: `2px solid ${q.id === focusedId ? "#0D0D0D" : "transparent"}`, background: q.id === focusedId ? "rgba(255,255,255,0.6)" : "transparent", opacity: snz ? 0.55 : 1, transition: "background 120ms" }}>
                    <div onClick={() => { p.onBrief(q.id); const fi = navRows.findIndex((r) => r.id === q.id); if (fi >= 0) setFocusIdx(fi); }} className="ct-qrow" style={{ display: "flex", alignItems: "center", gap: 18, padding: "17px 4px 17px 10px", cursor: "pointer", transition: "background 150ms" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 13, letterSpacing: "0.1em", color: "#8F8F8F", flex: "none", width: 24 }}>{String(idx + 1).padStart(2, "0")}</span>
                      <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: dot }} />
                      {selectable && <div onClick={(e) => { e.stopPropagation(); p.onWaSel(q.id); }} title="Select for bulk approval" style={{ width: 15, height: 15, flex: "none", border: "1px solid #C9C9C9", borderRadius: 5, background: p.waSel[q.id] ? "#0D0D0D" : "transparent", cursor: "pointer", transition: "background 150ms" }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: !active ? "#8F8F8F" : "#0D0D0D", textDecoration: done ? "line-through" : "none" }}>{q.name}</span>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: clockColor }}>{q.status} · {q.cycle} cadence · {q.clock}</span>
                          {q.best && active && <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.06em", color: "#8F8F8F", fontStyle: "italic" }}>best window · {q.best}</span>}
                          {q.signal && active && <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.04em", color: "#0D0D0D" }}>{q.signal}</span>}
                          {snz && <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F", fontStyle: "italic" }}>Snoozed · returns {snz}</span>}
                        </div>
                        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#5D5D5D", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.ctx}</div>
                        {showDraftLine && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, fontStyle: "italic", color: "#8F8F8F", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Draft · “{q.brief.draft.replace(/^"|"$/g, "")}”</div>}
                      </div>
                      <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: modeColor, border: "1px solid #E3E3E3", padding: "3px 7px", flex: "none" }}>{modeChip}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", flex: "none", width: 52, textAlign: "right" }}>{q.min} min</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", flex: "none", width: 66, textAlign: "right" }}>{q.wgci}</span>
                      <div style={{ display: "flex", gap: 8, flex: "none" }} onClick={(e) => e.stopPropagation()}>
                        {active && <>
                          <span onClick={() => p.onSnooze(q, "Tue")} title="Snooze 1 day" className="ct-snz" style={{ alignSelf: "center", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#8F8F8F", border: "1px solid #E3E3E3", padding: "5px 8px", cursor: "pointer", transition: "all 150ms" }}>1d</span>
                          <span onClick={() => p.onSnooze(q, "Thu")} title="Snooze 3 days" className="ct-snz" style={{ alignSelf: "center", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#8F8F8F", border: "1px solid #E3E3E3", padding: "5px 8px", cursor: "pointer", transition: "all 150ms" }}>3d</span>
                        </>}
                        {snz && <span onClick={() => p.onSnooze(q, snz)} className="ct-snz" style={{ alignSelf: "center", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5D5D5D", border: "1px solid #E3E3E3", padding: "5px 8px", cursor: "pointer", transition: "all 150ms" }}>Unsnooze</span>}
                        {q.draft && <button className="ct-draftbtn" style={{ background: "transparent", border: "1px solid #E3E3E3", padding: "6px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "background 150ms" }}>Draft</button>}
                        <button onClick={() => p.onLog(q)} className="ct-logbtn" style={{ background: "transparent", border: "1px solid #D9D9D9", borderRadius: 999, padding: "6px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "background 150ms" }}>Log touch</button>
                      </div>
                    </div>
                    {p.briefOpen === q.id && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: "1px solid #E3E3E3", background: "rgba(255,255,255,0.62)" }}>
                        <div style={{ padding: "14px 18px", borderRight: "1px solid #E3E3E3" }}>
                          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>Where you left off</div>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.6, color: "#303030", marginTop: 5 }}>{q.brief.last}</div>
                          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", marginTop: 12 }}>Today's objective</div>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.6, color: "#303030", marginTop: 5 }}>{q.brief.goal}</div>
                        </div>
                        <div style={{ padding: "14px 18px" }}>
                          {q.brief.draft && <>
                            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F" }}>Draft ready</div>
                            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.65, fontStyle: "italic", color: "#303030", marginTop: 5 }}>{q.brief.draft}</div>
                            {p.sent[q.id] ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D0D0D" }} />
                                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D" }}>{p.sent[q.id]}</span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button onClick={() => p.onSend(q, "WhatsApp")} className="ct-sendwa" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid #E3E3E3", padding: "7px 15px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "background 150ms" }}>Send · WhatsApp</button>
                                <button onClick={() => p.onSend(q, "Email")} className="ct-sendemail" style={{ background: "transparent", border: "1px solid #E3E3E3", padding: "7px 15px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "all 150ms" }}>Send · Email</button>
                              </div>
                            )}
                          </>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.6, color: "#8F8F8F", marginTop: 16 }}>Cadence: HOT every 3 days · WARM every 7 · ACTIVE clients weekly · PAST clients quarterly. An inbound touch resets the clock automatically. <span style={{ color: "#5D5D5D" }}>Keyboard: J/K select · L log · S snooze.</span></div>
    </>
  );
}
