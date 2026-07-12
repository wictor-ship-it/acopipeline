import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import { AGR_ESSENTIALS, AGR_META, AGR_SECTIONS, PT_NAME } from "./data";
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
  const [accepted, setAccepted] = useState(false);
  const [agrOpen, setAgrOpen] = useState(false);
  const [agrSent, setAgrSent] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const register = () => {
    if (!accepted) return;
    const who = form.name.trim() || "New referral";
    setDone(true);
    void recordAction({ actor: "user", skill: "compliance", action: `Partner portal · referral registered — ${who} · ${type} · ${form.budget || "budget TBD"} · by ${PT_NAME} · agreement accepted in-portal (timestamp priority §3.3)` }, "referral/new", () => setDone(false));
  };
  const emailAgreement = () => {
    if (agrSent) return;
    setAgrSent(true);
    void recordAction({ actor: "agent", skill: "compliance", action: `Referral agreement e-mailed to all parties — ${PT_NAME}, Wictor & A/CO records · PDF (mock)` }, "referral/agreement", () => setAgrSent(false));
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
          {/* Referral agreement — the essentials */}
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, background: "rgba(255,255,255,0.35)", padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F" }}>Referral agreement — the essentials</div>
              <span onClick={() => setAgrOpen(true)} className="pt-back" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Read full agreement ›</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
              {AGR_ESSENTIALS.map(([lead, rest]) => (
                <div key={lead} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: "#0D0D0D", position: "relative", top: -2 }} />
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.55, color: "#303030" }}><span style={{ fontWeight: 600 }}>{lead}</span> {rest}</span>
                </div>
              ))}
            </div>
            <div onClick={() => setAccepted((a) => !a)} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, cursor: "pointer", userSelect: "none" }}>
              <span style={{ width: 16, height: 16, flex: "none", border: `1px solid ${accepted ? "#0D0D0D" : "#8F8F8F"}`, background: accepted ? "#0D0D0D" : "transparent", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FFFFFF" }}>{accepted ? "✓" : ""}</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#0D0D0D" }}>I have read and accept the full referral agreement</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={register} disabled={!accepted} className="pt-btn-solid" style={{ background: "#0D0D0D", border: "none", borderRadius: 999, padding: "11px 22px", fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#FFFFFF", cursor: accepted ? "pointer" : "not-allowed", opacity: accepted ? 1 : 0.45 }}>Register — start protection</button>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>{accepted ? "licensed agents only — DBPR · CRECI · §8" : "accept the agreement to register — §8"}</span>
          </div>
        </div>
      )}

      {/* FULL AGREEMENT · modal */}
      {agrOpen && (
        <>
          <div onClick={() => setAgrOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.34)" }} />
          <div className="pt-agr">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "20px 26px 14px", borderBottom: "1px solid #E3E3E3" }}>
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Real Estate Referral Agreement</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 3 }}>Exclusive referral partnership · State of Florida</div>
              </div>
              <span onClick={() => setAgrOpen(false)} className="pt-back" style={{ fontFamily: SANS, fontWeight: 200, fontSize: 20, color: "#8F8F8F", cursor: "pointer", lineHeight: 1 }}>×</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 26px 20px" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {AGR_META.map((m) => <span key={m} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#5D5D5D", border: "1px solid #E3E3E3", borderRadius: 999, padding: "4px 11px", background: "rgba(255,255,255,0.55)" }}>{m}</span>)}
              </div>
              {AGR_SECTIONS.map((sec) => (
                <div key={sec.h} style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12.5, color: "#0D0D0D" }}>{sec.h}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, lineHeight: 1.65, color: "#303030", marginTop: 5 }}>{sec.b}</div>
                </div>
              ))}
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", marginTop: 18, borderTop: "1px solid #ECECEC", paddingTop: 12 }}>Acceptance in-portal is recorded with timestamp and device — it binds the registration you submit. The signed PDF is filed to A/CO records and e-mailed to all parties on request.</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "14px 26px", borderTop: "1px solid #E3E3E3", background: "rgba(255,255,255,0.5)" }}>
              <button onClick={emailAgreement} className="pt-btn-solid" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "10px 18px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>{agrSent ? "E-mailed to all parties ✓ · Jul 10" : "E-mail agreement — all parties"}</button>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>goes to you, Wictor and A/CO records · PDF</span>
              <span style={{ flex: 1 }} />
              <button onClick={() => setAgrOpen(false)} className="pt-btn" style={{ background: "transparent", border: "1px solid #B4B4B4", borderRadius: 999, padding: "10px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
