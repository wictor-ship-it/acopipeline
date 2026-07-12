import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import { KITS, PT_NAME, PT_PROJECTS } from "./data";
import "./Partner.css";

/* SCREEN · PARTNER · COLLATERALS (fragment 10) — developer marketing kits. */
export function PartnerCollaterals() {
  const download = (project: string, kit: string) => void recordAction({ actor: "user", action: `Collaterals · downloaded — ${project} · ${kit} · ${PT_NAME}` }, "collaterals", () => {});
  return (
    <div style={{ padding: "22px 48px 120px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #E3E3E3", paddingBottom: 16 }}>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>Collaterals — developer marketing kits</div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, lineHeight: 1.6, color: "#8F8F8F", marginTop: 6 }}>Brochures, fact sheets, floor plans and price lists for the new-development portfolio. Approved for partner use — do not alter pricing or make promises on the brokerage's behalf (§12).</div>
        </div>
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.03em", color: "#0D0D0D", border: "1px solid #E3E3E3", borderRadius: 999, padding: "8px 16px" }}>arraescollection.com/new-developments ↗</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginTop: 22 }}>
        {PT_PROJECTS.map((pj) => (
          <div key={pj.name} className="pt-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14.5, color: "#0D0D0D" }}>{pj.name}</span>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: pj.stC, whiteSpace: "nowrap" }}>{pj.st}</span>
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", marginTop: 2 }}>{pj.loc}</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12.5, color: "#0D0D0D" }}>{pj.from}</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#5D5D5D" }}>{pj.del}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid #ECECEC", paddingTop: 10 }}>
              {KITS.map((k) => <span key={k} onClick={() => download(pj.name, k)} className="pt-kit" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#303030", background: "rgba(255,255,255,0.55)", border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 12px", cursor: "pointer", transition: "all 150ms", whiteSpace: "nowrap" }}>{k} ↓</span>)}
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, color: "#B8B8B8" }}>{pj.upd}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", marginTop: 16 }}>Every download is logged to your file. Price lists follow the developer's current release — always confirm before quoting. Commission on pre-construction follows the disbursement schedule — §6, §7.</div>
    </div>
  );
}
