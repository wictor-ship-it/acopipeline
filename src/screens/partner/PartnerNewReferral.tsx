import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import { PT_NAME } from "./data";
import "./Partner.css";

/* SCREEN · PARTNER · NEW REFERRAL (fragment 13) — registration form. */
const chip = (on: boolean): React.CSSProperties => ({ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 11, color: on ? "#0D0D0D" : "#5D5D5D", background: on ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${on ? "#0D0D0D" : "#E3E3E3"}`, borderRadius: 999, padding: "6px 13px", cursor: "pointer", userSelect: "none", transition: "all 150ms", whiteSpace: "nowrap" });
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3", padding: "8px 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", outline: "none" };
const labelStyle: React.CSSProperties = { fontFamily: SANS, fontWeight: 600, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8F8F8F" };

export function PartnerNewReferral() {
  const navigate = useNavigate();
  const [type, setType] = useState("Purchase");
  const [purpose, setPurpose] = useState("Investment");
  const [form, setForm] = useState({ name: "", email: "", phone: "", nat: "", budget: "", time: "" });
  const [done, setDone] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const register = () => {
    const who = form.name.trim() || "New referral";
    setDone(true);
    void recordAction({ actor: "user", skill: "compliance", action: `Partner portal · referral registered — ${who} · ${type} · ${form.budget || "budget TBD"} · by ${PT_NAME} (timestamp priority §3.3)` }, "referral/new", () => setDone(false));
  };

  return (
    <div style={{ padding: "22px 48px 120px", maxWidth: 720 }}>
      <div style={{ borderBottom: "1px solid #E3E3E3", paddingBottom: 16 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Register a referral</div>
        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.6, color: "#8F8F8F", marginTop: 6 }}>Register before, or simultaneously with, any introduction — your timestamp governs priority (§3.3). Acknowledgment within 2 business days; decline only within 5 (§3, §9).</div>
      </div>

      {done ? (
        <div className="pt-card" style={{ padding: "24px 26px", marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10A37F" }} /><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: "#0D0D0D" }}>Registered · protection clock started</span></div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: "#5D5D5D", marginTop: 8 }}>{form.name || "Your referral"} is timestamped and awaiting A/CO acknowledgment (≤2 business days). Protected 12 months from today · fee 25% of Gross Commission · §6. It appears in your pipeline now.</div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => navigate("/partner/pipeline")} className="pt-btn-solid" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "9px 18px", fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Open pipeline ›</button>
            <button onClick={() => { setDone(false); setForm({ name: "", email: "", phone: "", nat: "", budget: "", time: "" }); }} className="pt-btn" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "9px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Register another</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <div style={labelStyle}>Transaction type</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{["Purchase", "Investment", "Rental"].map((t) => <span key={t} onClick={() => setType(t)} style={chip(type === t)}>{t}</span>)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px 40px" }}>
            <div><div style={labelStyle}>Full legal name</div><input value={form.name} onChange={set("name")} placeholder="Client name" className="pt-input" style={inputStyle} /></div>
            <div><div style={labelStyle}>E-mail</div><input value={form.email} onChange={set("email")} placeholder="name@email.com" className="pt-input" style={inputStyle} /></div>
            <div><div style={labelStyle}>WhatsApp</div><input value={form.phone} onChange={set("phone")} placeholder="+55 …" className="pt-input" style={inputStyle} /></div>
            <div><div style={labelStyle}>Nationality &amp; residence</div><input value={form.nat} onChange={set("nat")} placeholder="e.g. Brazil · São Paulo" className="pt-input" style={inputStyle} /></div>
            <div><div style={labelStyle}>Budget range · USD</div><input value={form.budget} onChange={set("budget")} placeholder="$4–6M" className="pt-input" style={inputStyle} /></div>
            <div><div style={labelStyle}>Timeline</div><input value={form.time} onChange={set("time")} placeholder="Next 3–6 months" className="pt-input" style={inputStyle} /></div>
          </div>
          <div>
            <div style={labelStyle}>Purpose</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>{["Personal use", "Investment", "Rental income", "Vacation home"].map((p) => <span key={p} onClick={() => setPurpose(p)} style={chip(purpose === p)}>{p}</span>)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={register} className="pt-btn-solid" style={{ background: "#0D0D0D", border: "none", borderRadius: 999, padding: "11px 22px", fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#FFFFFF", cursor: "pointer" }}>Register — start protection</button>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>licensed agents only — DBPR · CRECI · §8</span>
          </div>
        </div>
      )}
    </div>
  );
}
