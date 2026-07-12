import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import { PT_CARDS, PT_RECORD } from "./data";
import "./Partner.css";

/* SCREEN · PARTNER · REFERRAL RECORD (fragment 14) */
const DOT: Record<string, string> = { done: "#0D0D0D", next: "#B45309", current: "#B45309", future: "#D9D9D9" };

export function PartnerReferralRecord() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [tab, setTab] = useState<"tl" | "docs" | "notes">("tl");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Array<[string, string, string]>>([]);

  const card = PT_CARDS.find((c) => c.id === id);
  const rec = PT_RECORD[id];
  if (!card || !rec) return <div style={{ padding: "40px 48px", fontFamily: SANS, color: "#8F8F8F" }}>Referral not found. <span onClick={() => navigate("/partner/pipeline")} style={{ color: "#0D0D0D", cursor: "pointer", textDecoration: "underline" }}>Back to portal</span></div>;

  const allComments = [...notes, ...rec.comments];
  const sendNote = () => { const t = note.trim(); if (!t) return; setNotes((n) => [["A. Bittencourt", "Now", t], ...n]); setNote(""); void recordAction({ actor: "user", action: `Partner note — ${card.title}: "${t}"` }, `referral/${id}`, () => {}); };

  return (
    <div style={{ padding: "22px 48px 120px" }}>
      <span onClick={() => navigate("/partner/pipeline")} className="pt-back" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D", cursor: "pointer" }}>‹ Partner Portal</span>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginTop: 16, borderBottom: "1px solid #E3E3E3", paddingBottom: 22 }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F" }}>Referral Record</div>
          <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 30, color: "#0D0D0D", marginTop: 8 }}>{card.title}</div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#5D5D5D", marginTop: 5 }}>{card.kind} · lead {card.lead}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#FFFFFF", background: "#0D0D0D", borderRadius: 999, padding: "5px 12px" }}>{rec.track[Math.min(rec.idx, rec.track.length - 1)]}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: rec.protColor, border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 12px" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: rec.protColor }} />{rec.prot}</span>
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5D5D5D", border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 12px" }}>Agreement · 25% of Gross Commission</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
          {rec.nums.map((n) => (
            <div key={n.label} style={{ minWidth: 120 }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F" }}>{n.label}</div>
              <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 25, color: "#0D0D0D", marginTop: 7 }}>{n.value}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", marginTop: 3, maxWidth: 190 }}>{n.note}</div>
            </div>
          ))}
        </div>
      </div>

      {rec.tcMiles && (
        <section className="pt-card" style={{ marginTop: 24, padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Closing milestones</span><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>mirrored live from the transaction file</span></div>
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: 16, overflowX: "auto", paddingBottom: 4 }}>
            {rec.tcMiles.map(([label, date, st], i) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 96 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: DOT[st], border: "1px solid rgba(0,0,0,0.08)" }} />
                  <span style={{ fontFamily: SANS, fontSize: 11, lineHeight: 1.35, color: st === "future" ? "#8F8F8F" : "#0D0D0D", fontWeight: st === "current" ? 600 : 400, maxWidth: 104 }}>{label}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, color: "#8F8F8F" }}>{date}</span>
                </div>
                {i < rec.tcMiles!.length - 1 && <div style={{ flex: 1, height: 1, background: "#E3E3E3", margin: "4px 10px 0 6px", minWidth: 14 }} />}
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F" }}>Stage path</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 10 }}>
          {rec.track.map((label, i) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: i < rec.idx ? "#0D0D0D" : i === rec.idx ? "#B45309" : "#D9D9D9" }} />
              <span style={{ fontFamily: SANS, fontSize: 11.5, letterSpacing: "0.02em", color: i > rec.idx ? "#8F8F8F" : "#0D0D0D", fontWeight: i === rec.idx ? 600 : 400 }}>{label}</span>
            </span>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #E3E3E3", marginTop: 26 }}>
        {([["Timeline", "tl"], ["Documents", "docs"], ["Notes", "notes"]] as const).map(([label, id2]) => {
          const on = tab === id2;
          return <span key={id2} onClick={() => setTab(id2)} style={{ fontFamily: SANS, fontWeight: on ? 400 : 300, fontSize: 13, letterSpacing: "0.06em", color: on ? "#0D0D0D" : "#8F8F8F", padding: "16px 0", borderBottom: `2px solid ${on ? "#0D0D0D" : "transparent"}`, cursor: "pointer", transition: "color 150ms" }}>{label}</span>;
        })}
      </div>

      {tab === "tl" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 26, alignItems: "start", marginTop: 20 }}>
          <div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F" }}>Upcoming</div>
            {rec.miles.map(([d, txt, st]) => (
              <div key={txt} style={{ display: "flex", alignItems: "baseline", gap: 11, padding: "10px 2px", borderBottom: "1px solid #ECECEC" }}>
                <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: DOT[st], position: "relative", top: -2 }} />
                <span style={{ width: 46, flex: "none", fontFamily: SANS, fontWeight: 300, fontSize: 11, color: "#8F8F8F" }}>{d}</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: "#303030" }}>{txt}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F" }}>History — every touch</div>
            {rec.hl.map(([d, txt]) => (
              <div key={txt} style={{ display: "flex", alignItems: "baseline", gap: 11, padding: "10px 2px", borderBottom: "1px solid #ECECEC" }}>
                <span style={{ width: 46, flex: "none", fontFamily: SANS, fontWeight: 300, fontSize: 11, color: "#8F8F8F" }}>{d}</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: "#303030" }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "docs" && (
        <div className="pt-card" style={{ maxWidth: 640, marginTop: 20, overflow: "hidden" }}>
          {card.docs.map(([name, meta]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #ECECEC" }}>
              <span style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: "#0D0D0D" }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{name}</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 2 }}>{meta}</div></div>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F" }}>shared with you</span>
            </div>
          ))}
        </div>
      )}

      {tab === "notes" && (
        <div style={{ maxWidth: 640, marginTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allComments.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F" }}>No notes yet — leave one for Wictor below.</div>}
            {allComments.map(([who, when, text], i) => { const mine = who !== "Wictor"; return (
              <div key={i} style={{ borderLeft: `2px solid ${mine ? "#B45309" : "#0D0D0D"}`, padding: "3px 0 3px 12px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, color: mine ? "#B45309" : "#0D0D0D" }}>{who}</span><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, color: "#8F8F8F" }}>{when}</span></div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.6, color: "#303030", marginTop: 3 }}>{text}</div>
              </div>
            ); })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendNote(); }} placeholder="Note for Wictor — context, warmth, timing…" className="pt-input" style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.6)", border: "1px solid #E3E3E3", borderRadius: 999, padding: "10px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#0D0D0D", outline: "none" }} />
            <button onClick={sendNote} className="pt-btn-solid" style={{ flex: "none", background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "10px 18px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Send</button>
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", marginTop: 10 }}>Notes land on the deal record — Wictor and the agent both see them.</div>
        </div>
      )}
    </div>
  );
}
