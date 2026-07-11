import { useState } from "react";
import content from "../../data/seed/content.json";
import type { Activity, ActivityType } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import { newId, save } from "../../data/repository";
import "./Activities.css";

const AGENDA = content.activitiesAgenda;
const LOG_TYPES: ActivityType[] = ["call", "whatsapp", "email", "showing", "note", "task"];
const OUTCOME_COLOR: Record<string, string> = { advanced: "#10A37F", neutral: "#8F8F8F", cooled: "#D0342C" };

export function Activities() {
  const { items: log } = useCollection<Activity>("activities");
  const [tab, setTab] = useState<"agenda" | "log">("agenda");
  const [modal, setModal] = useState(false);

  const sorted = [...log].sort((a, b) => (b.id > a.id ? 1 : -1));

  return (
    <div className="ac-wrap">
      <div className="ac-head">
        <div>
          <div className="ac-title">Activities</div>
          <div className="ac-sub">Every commitment and task — kept, confirmed and chased by the agent</div>
        </div>
        <button className="ac-log-btn" onClick={() => setModal(true)}>Log activity</button>
      </div>

      <div className="ac-tabs">
        <div className={`ac-tab${tab === "agenda" ? " active" : ""}`} onClick={() => setTab("agenda")}>Agenda</div>
        <div className={`ac-tab${tab === "log" ? " active" : ""}`} onClick={() => setTab("log")}>Log</div>
      </div>

      {tab === "agenda" ? (
        <>
          <div className="ac-summary">
            {AGENDA.summaryBand.map((s) => (
              <div className="ac-sum-card" key={s.label}>
                <div className="ac-sum-label">{s.label}</div>
                <div className="ac-sum-deltas">{s.deltas.map((d) => <span className="ac-sum-delta" key={d}>{d}</span>)}</div>
              </div>
            ))}
          </div>
          {AGENDA.agenda.map((day) => (
            <div className="ac-day" key={day.day}>
              <div className="ac-day-label">{day.day}</div>
              {day.rows.map((r, i) => (
                <div className="ac-row" key={i}>
                  <span className="ac-time">{r.time}</span>
                  <div><div className="ac-what">{r.what}</div><div className="ac-who">{r.who}</div></div>
                  <span className="ac-st">{r.st}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      ) : (
        <div>
          {sorted.map((a) => (
            <div className="ac-log-row" key={a.id}>
              <span className="ac-log-date">{a.date}</span>
              <span className="ac-log-type">{a.type}</span>
              <div className="ac-log-body">
                <div className="n">{a.label} {a.by_agent && <span className="ac-agent-tag">· agent</span>}</div>
                <div className="b">{a.body}</div>
              </div>
              <span className="ac-log-outcome" style={{ color: OUTCOME_COLOR[a.outcome ?? "neutral"] }}>{a.outcome}</span>
            </div>
          ))}
        </div>
      )}

      {modal && <LogModal onClose={() => setModal(false)} onSaved={() => { setModal(false); setTab("log"); }} />}
    </div>
  );
}

function LogModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<ActivityType>("note");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");

  async function saveLog() {
    const activity: Activity = {
      id: newId("act"),
      type,
      label: label || "Untitled",
      body,
      date: "now",
      outcome: "neutral",
      by_agent: false,
    };
    await save("activities", activity, { actor: "user", action: `Activity logged — ${type} · ${label || "untitled"}` });
    onSaved();
  }

  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ac-modal-title">Log activity</div>
        <div className="ac-modal-types">
          {LOG_TYPES.map((t) => (
            <span key={t} className={`ac-type-chip${type === t ? " active" : ""}`} onClick={() => setType(t)}>{t}</span>
          ))}
        </div>
        <input className="ac-modal-input" placeholder="Contact or deal…" value={label} onChange={(e) => setLabel(e.target.value)} />
        <textarea className="ac-modal-textarea" placeholder="What happened?" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="ac-modal-actions">
          <button className="ac-btn ac-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ac-btn ac-btn-primary" onClick={() => void saveLog()}>Log it</button>
        </div>
      </div>
    </div>
  );
}
