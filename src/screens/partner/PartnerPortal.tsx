import { SANS } from "../contacts/data";
import { PT_CARDS, PT_COLS } from "./data";
import "./Partner.css";

/* SCREEN · PARTNER PORTAL / PIPELINE (fragment 12) — the referral pipeline. */
export function PartnerPortal() {
  return (
    <div style={{ padding: "22px 48px 120px" }}>
      <div style={{ borderBottom: "1px solid #E3E3E3", paddingBottom: 16 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Your pipeline — every referral, tracked</div>
        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F", marginTop: 6 }}>The agent updates each card as the deal moves — milestones, documents and fee status. You see exactly what A/CO sees on your referrals, nothing else.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 22, alignItems: "start" }}>
        {PT_COLS.map((col) => {
          const cards = PT_CARDS.filter((c) => col.ids.includes(c.col));
          return (
            <div key={col.title}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid #0D0D0D", marginBottom: 14 }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>{col.title}</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>{cards.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cards.map((c) => (
                  <div key={c.id} className="pt-card" style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "#0D0D0D" }}>{c.title}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: c.feeColor, whiteSpace: "nowrap" }}>{c.feeSt}</span>
                    </div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", marginTop: 2 }}>{c.lead} · {c.kind}</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #ECECEC" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D" }}>{c.next}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "#0D0D0D" }}>{c.fee}</span>
                    </div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: c.feeColor, marginTop: 4 }}>{c.feeWhen}</div>
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #ECECEC" }}>
                      {c.docs.map(([d, s]) => (
                        <div key={d} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "5px 0" }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#303030" }}>{d}</span>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, color: "#8F8F8F", whiteSpace: "nowrap" }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, lineHeight: 1.6, color: "#8F8F8F", marginTop: 20 }}>Every milestone and interaction on your referrals is logged and, with auto-updates on, e-mailed to you. Fees release on recorded closing — §7.</div>
    </div>
  );
}
