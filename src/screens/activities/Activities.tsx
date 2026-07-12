import { useMemo, useState } from "react";
import { newId, save } from "../../data/repository";
import { useCollection } from "../../data/hooks";
import type { Activity } from "../../domain/types";
import { SANS, CONTACT_TASKS } from "../contacts/data";
import "./Activities.css";

/* ================= SCREEN · ACTIVITIES · AGENDA (fragment 15) =================
   Every commitment and task — kept, confirmed and chased by the agent.
   Schedule + Open Tasks + History (the full activity log). */

const AG_DAYS: Array<{ label: string; rows: Array<{ time: string; what: string; who: string; st: string; stC: string; dot: string }> }> = [
  { label: "Today · Mon Jul 06", rows: [
    { time: "09:30", what: "Inspection window opens — Sterling · Acqualina 4802", who: "vendor on site · TC tracking", st: "Tracked", stC: "#B45309", dot: "#B45309" },
    { time: "11:00", what: "Call · Anton Keller — Golden Beach counter", who: "15 min · agenda drafted by the agent", st: "Confirmed", stC: "#10A37F", dot: "#0D0D0D" },
    { time: "15:00", what: "Listing consult — Fisher Island Villa", who: "seller lead · valuation pack ready", st: "Confirmed", stC: "#10A37F", dot: "#0D0D0D" },
    { time: "18:30", what: "Preview · Rivage PH-A — buyer via attorney", who: "NDA on file · watermarked dossier", st: "Quiet", stC: "#8F8F8F", dot: "#8F8F8F" } ] },
  { label: "Tomorrow · Tue Jul 07", rows: [
    { time: "10:00", what: "Tour · Faena Residence 9B — rental", who: "tenant · access confirmed with building", st: "Confirmed", stC: "#10A37F", dot: "#0D0D0D" },
    { time: "14:00", what: "Deadline · inspection period ends — Sterling", who: "summary auto-drafts on close", st: "Deadline", stC: "#D0342C", dot: "#D0342C" } ] },
  { label: "This week", rows: [
    { time: "Jul 09", what: "2nd visit · Marcelo — Rivage PH-A", who: "Sat 11:00 proposed · awaiting confirm", st: "Pending", stC: "#B45309", dot: "#B45309" },
    { time: "Jul 11", what: "HOA package due — Sterling", who: "T-3 chase armed", st: "Deadline", stC: "#D0342C", dot: "#D0342C" },
    { time: "Jul 15", what: "Phase II environmental — Zurich FO · 1031", who: "day 38 of 45 · vendor confirmed", st: "Tracked", stC: "#B45309", dot: "#B45309" } ] },
];

const CONTACT_NAMES: Record<string, string> = { marcelo: "Marcelo Carvalho", keller: "Anton Keller", sterling: "Robert Sterling", bittencourt: "Ana Bittencourt", zanotti: "Valdemar Zanotti", nakamura: "Kenji Nakamura", ravel: "Elena Ravel", alvarez: "Carlos Alvarez" };
const LOG_TYPES = ["Call", "WhatsApp", "Email", "Showing", "Note", "Task"];
const ACT_TYPE_MAP: Record<string, Activity["type"]> = { Call: "call", WhatsApp: "whatsapp", Email: "email", Showing: "showing", Note: "note", Task: "task" };
const TYPE_LABEL: Record<string, string> = { call: "Call", whatsapp: "WhatsApp", email: "Email", showing: "Showing", note: "Note", task: "Task" };
const OUTCOME_DOT: Record<string, string> = { advanced: "#10A37F", neutral: "#8F8F8F", cooled: "#D0342C" };
const FILTERS: Array<[string, string]> = [["All", "all"], ["Calls", "call"], ["WhatsApp", "whatsapp"], ["Emails", "email"], ["Showings", "showing"], ["Notes", "note"]];

export function Activities() {
  const { items: activities } = useCollection<Activity>("activities");
  const [logOpen, setLogOpen] = useState(false);
  const [logType, setLogType] = useState("Note");
  const [logName, setLogName] = useState("");
  const [logBody, setLogBody] = useState("");
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("all");

  const tasks = useMemo(() => Object.entries(CONTACT_TASKS).flatMap(([cid, list]) => list.map((x, i) => ({ id: `${cid}-t${i}`, t: x.t, due: x.due, who: CONTACT_NAMES[cid] ?? cid }))), []);
  const openTasks = tasks.filter((t) => !doneTasks[t.id]).length;

  const band = [
    { label: "Interactions · 14d", value: String(activities.length) },
    { label: "Advanced", value: String(activities.filter((a) => a.outcome === "advanced").length) },
    { label: "Showings", value: String(activities.filter((a) => a.type === "showing").length) },
    { label: "Calls", value: String(activities.filter((a) => a.type === "call").length) },
  ];

  const feed = useMemo(() => {
    const filtered = activities.filter((a) => filter === "all" || a.type === filter);
    const byDate: Array<{ date: string; items: Activity[] }> = [];
    for (const a of filtered) { let g = byDate.find((x) => x.date === (a.date ?? "")); if (!g) { g = { date: a.date ?? "", items: [] }; byDate.push(g); } g.items.push(a); }
    return byDate;
  }, [activities, filter]);

  const submitLog = () => {
    const name = logName.trim(), body = logBody.trim();
    if (!name && !body) return;
    const act: Activity = { id: newId("act"), type: ACT_TYPE_MAP[logType] ?? "note", body: body || "—", outcome: logType === "Task" ? undefined : "neutral", date: "Jul 06", label: name || "Untitled", by_agent: false };
    void save<Activity>("activities", act, { actor: "user", action: `Logged ${logType.toLowerCase()} — ${name || "Untitled"}` });
    setLogName(""); setLogBody(""); setLogOpen(false);
  };
  const toggleTask = (id: string) => { const was = !!doneTasks[id]; setDoneTasks((p) => ({ ...p, [id]: !p[id] })); void save<Activity>("activities", { id: newId("task"), type: "task", body: tasks.find((t) => t.id === id)?.t ?? id, done: !was, date: "Jul 06", label: "Task", by_agent: false }, { actor: "user", action: `${!was ? "Completed" : "Reopened"} task — ${tasks.find((t) => t.id === id)?.t ?? id}` }); };

  return (
    <div style={{ padding: "22px 48px 44px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, borderBottom: "1px solid #E3E3E3", paddingBottom: 14 }}>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Activities · Agenda</div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F", marginTop: 4 }}>Every commitment and task — kept, confirmed and chased by the agent</div>
        </div>
        <button onClick={() => setLogOpen((o) => !o)} className="ag-btn" style={{ marginBottom: 6, background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "10px 18px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Log activity</button>
      </div>

      {logOpen && (
        <div style={{ border: "1px solid #E3E3E3", borderRadius: 14, background: "rgba(249,249,249,0.55)", padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", marginBottom: 14 }}>Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LOG_TYPES.map((t) => { const on = logType === t; return <div key={t} onClick={() => setLogType(t)} style={{ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 11.5, color: on ? "#0D0D0D" : "#5D5D5D", background: on ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${on ? "#0D0D0D" : "#E3E3E3"}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer", userSelect: "none", transition: "all 150ms" }}>{t}</div>; })}
          </div>
          <input value={logName} onChange={(e) => setLogName(e.target.value)} placeholder="Deal or contact" className="ag-input" style={{ width: "100%", boxSizing: "border-box", marginTop: 18, background: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.65)", borderRadius: 10, padding: "10px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#0D0D0D", outline: "none" }} />
          <textarea value={logBody} onChange={(e) => setLogBody(e.target.value)} placeholder="What happened?" rows={2} className="ag-input" style={{ width: "100%", boxSizing: "border-box", marginTop: 14, background: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.65)", borderRadius: 10, padding: "10px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 14.5, lineHeight: 1.5, color: "#303030", outline: "none", resize: "none" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button onClick={() => setLogOpen(false)} className="ag-btn-ghost" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "9px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Cancel</button>
            <button onClick={submitLog} className="ag-btn" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "9px 18px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Log entry</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 30, alignItems: "start", marginBottom: 36 }}>
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Schedule</span>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>synced · Google Calendar</span>
          </div>
          {AG_DAYS.map((d) => (
            <div key={d.label}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 4px 8px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5D5D5D" }}>{d.label}</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>{d.rows.length}</span>
              </div>
              {d.rows.map((a, i) => (
                <div key={i} className="ag-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 4px", borderBottom: "1px solid #ECECEC", transition: "background 150ms" }}>
                  <span style={{ width: 44, flex: "none", fontFamily: SANS, fontWeight: 300, fontSize: 12, letterSpacing: "0.02em", color: "#5D5D5D" }}>{a.time}</span>
                  <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: a.dot }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D" }}>{a.what}</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", marginTop: 2 }}>{a.who}</div></div>
                  <span style={{ flex: "none", fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: a.stC }}>{a.st}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Open Tasks</span>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>{openTasks} open</span>
          </div>
          <div style={{ borderTop: "1px solid #E3E3E3" }}>
            {tasks.map((t) => { const done = !!doneTasks[t.id]; return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderBottom: "1px solid #ECECEC" }}>
                <div onClick={() => toggleTask(t.id)} style={{ width: 14, height: 14, flex: "none", border: "1px solid #D9D9D9", borderRadius: 4, background: done ? "#0D0D0D" : "transparent", cursor: "pointer", transition: "background 150ms" }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: done ? "#8F8F8F" : "#0D0D0D", textDecoration: done ? "line-through" : "none" }}>{t.t}</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 2 }}>{t.who}</div></div>
                <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F" }}>{t.due}</span>
              </div>
            ); })}
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 12 }}>Done tasks feed the audit — the agent chases the overdue ones.</div>
        </section>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, borderTop: "1px solid #0D0D0D", paddingTop: 16, marginBottom: 6 }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>History</span>
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>the full activity log · everything the agent and you did</span>
      </div>
      <div className="ag-band">
        {band.map((s, i) => (
          <div key={s.label} style={{ padding: "24px 22px", borderRight: i < 3 ? "1px solid #E3E3E3" : "none" }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{s.label}</div>
            <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 34, lineHeight: 1, marginTop: 14, color: "#0D0D0D" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "24px 0 6px" }}>
        {FILTERS.map(([label, id]) => { const on = filter === id; const count = id === "all" ? activities.length : activities.filter((a) => a.type === id).length; return (
          <div key={id} onClick={() => setFilter(id)} style={{ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 12.5, color: on ? "#0D0D0D" : "#5D5D5D", background: on ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${on ? "#D9D9D9" : "#E3E3E3"}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer", transition: "all 150ms" }}>{label} <span style={{ fontSize: 10, color: "#8F8F8F" }}>{count}</span></div>
        ); })}
      </div>
      {feed.map((d) => (
        <div key={d.date} style={{ marginTop: 30 }}>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8F8F8F", paddingBottom: 8 }}>{d.date} · 2026</div>
          {d.items.map((a) => (
            <div key={a.id} style={{ border: "1px solid #E3E3E3", borderRadius: 12, padding: "18px 22px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: OUTCOME_DOT[a.outcome ?? "neutral"] }} />
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#303030" }}>{TYPE_LABEL[a.type] ?? a.type}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D" }}>{a.label}</span>
                </div>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{a.outcome ?? ""}</span>
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: "#303030", marginTop: 10 }}>{a.body}</div>
              {a.by_agent && <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.06em", color: "#8F8F8F", marginTop: 8, fontStyle: "italic" }}>via voice memo · agent-structured</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
