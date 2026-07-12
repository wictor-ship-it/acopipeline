import { useNavigate } from "react-router-dom";
import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import { CONV_LINE, FEE_BARS, OUTCOME_BARS, PT_KPIS, PT_NAME, PT_ROWS, PT_TOTAL_LINE, VAL_ROWS } from "./data";
import "./Partner.css";

/* SCREEN · PARTNER DASHBOARD (fragment 11) */
export function PartnerDashboard() {
  const navigate = useNavigate();
  const statement = () => void recordAction({ actor: "user", action: `Partner portal · statement exported — PDF · ${PT_NAME}` }, "partner", () => {});
  return (
    <div style={{ padding: "22px 48px 120px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #E3E3E3", paddingBottom: 16 }}>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>{PT_NAME} — your referrals, live</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
            {["4 referred · 3 active", "$335K in motion", "94-day median to close"].map((c) => <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0D0D0D" }} />{c}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5D5D5D", border: "1px solid #E3E3E3", borderRadius: 999, padding: "6px 13px" }}>Agreement · 25% of Gross Commission</span>
          <button onClick={statement} className="pt-btn" style={{ background: "transparent", border: "1px solid #B4B4B4", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Statement PDF</button>
          <button onClick={() => navigate("/partner/new-referral")} className="pt-btn-solid" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer" }}>Register a referral</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 20 }}>
        {PT_KPIS.map((k) => (
          <div key={k.label} className="pt-card" style={{ padding: "15px 18px" }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F8F8F" }}>{k.label}</div>
            <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 26, color: "#0D0D0D", marginTop: 7 }}>{k.value}</div>
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", marginTop: 3 }}>{k.note}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14, marginTop: 24 }}>
        <div className="pt-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Fees</span><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>by status</span></div>
          <div style={{ marginTop: 12 }}>
            {FEE_BARS.map((b) => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0" }}>
                <span style={{ width: 128, flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D" }}>{b.label}</span>
                <div style={{ flex: 1, height: 12, borderRadius: 3, background: "rgba(13,13,13,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: b.w, background: b.c }} /></div>
                <span style={{ width: 70, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 12, color: "#0D0D0D" }}>{b.v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", marginTop: 10 }}>USD wire within 15 business days of receipt — transfer, conversion and intermediary costs deducted from the fee · §7</div>
        </div>
        <div className="pt-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Outcomes</span><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>lifetime</span></div>
          <div style={{ marginTop: 12 }}>
            {OUTCOME_BARS.map((b) => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0" }}>
                <span style={{ width: 128, flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D" }}>{b.label}</span>
                <div style={{ flex: 1, height: 12, borderRadius: 3, background: "rgba(13,13,13,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: b.w, background: "#0D0D0D" }} /></div>
                <span style={{ width: 70, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 12, color: "#0D0D0D" }}>{b.n}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", marginTop: 10 }}>{CONV_LINE}</div>
        </div>
      </div>

      <div className="pt-card" style={{ marginTop: 24, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "15px 20px", borderBottom: "1px solid #ECECEC", background: "rgba(255,255,255,0.38)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>Protection windows</span><span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>from registration</span></div>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>extension: written request ≥15 days before expiry · up to +6 months</span>
        </div>
        {VAL_ROWS.map((v) => (
          <div key={v.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid #ECECEC", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 170 }}><div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{v.name}</div><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", marginTop: 2 }}>{v.deal}</div></div>
            <span style={{ width: 170, flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#5D5D5D" }}>{v.reg} → {v.ends}</span>
            <div style={{ flex: 1, minWidth: 110, height: 4, borderRadius: 2, background: "rgba(13,13,13,0.07)", overflow: "hidden" }}><div style={{ height: "100%", width: v.pw, background: v.c }} /></div>
            <span style={{ width: 92, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#0D0D0D" }}>{v.left}</span>
            <span style={{ width: 210, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 500, fontSize: 10.5, color: v.c }}>{v.st}</span>
          </div>
        ))}
        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F", padding: "11px 20px" }}>Contract signed before expiry? A 60-day closing grace applies — §4.3. Fees are due only on closings inside the window — §4.2.</div>
      </div>

      <section style={{ marginTop: 30 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D0D0D", position: "relative", top: -2 }} />
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: "#0D0D0D" }}>Commissions</span>
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{PT_TOTAL_LINE}</span>
        </div>
        <div className="pt-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "11px 20px", borderBottom: "1px solid #ECECEC", background: "rgba(255,255,255,0.38)" }}>
            <span style={{ flex: 1, fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Deal</span>
            {["Base GCI", "Your share", "Status", "Expected"].map((h, i) => <span key={h} style={{ width: [90, 90, 150, 110][i], flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</span>)}
          </div>
          {PT_ROWS.map((r) => (
            <div key={r.deal} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "13px 20px", borderBottom: "1px solid #ECECEC" }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{r.deal}</span>
              <span style={{ width: 90, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{r.base}</span>
              <span style={{ width: 90, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 600, fontSize: 13, color: "#0D0D0D" }}>{r.share}</span>
              <span style={{ width: 150, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 500, fontSize: 11, color: r.stColor }}>{r.stText}</span>
              <span style={{ width: 110, flex: "none", textAlign: "right", fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{r.when}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, lineHeight: 1.6, color: "#8F8F8F", marginTop: 12 }}>Pre-construction referrals follow the developer disbursement schedule — your share credits as each installment is received. Fees release on recorded closing; statements reconcile monthly.</div>
      </section>
    </div>
  );
}
