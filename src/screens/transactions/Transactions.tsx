import { useNavigate } from "react-router-dom";
import { SANS } from "../contacts/data";
import "./Transactions.css";

/* ================= SCREEN 4 · TRANSACTIONS (fragment 04) =================
   The Transaction Coordinator record — a single in-contract transaction
   (Sterling · Acqualina 4802), reached from Pipeline · Under Contract and the
   "Open transaction" deep links. Milestones copied literally (logic ~1994). */

const TC_HEAD = ["Milestone", "Owner", "Deadline", "Status", "Action"];

interface Milestone { name: string; owner: string; deadline: string; dot: string; state: string; textColor: string; action: string }
const MILESTONES: Milestone[] = [
  { name: "Executed contract distributed", owner: "TC", deadline: "Jun 24", dot: "#0D0D0D", state: "Complete", textColor: "#0D0D0D", action: "—" },
  { name: "Escrow deposit confirmed", owner: "Buyer", deadline: "Jun 27", dot: "#0D0D0D", state: "Complete", textColor: "#0D0D0D", action: "—" },
  { name: "Inspection period ends", owner: "Buyer", deadline: "Jul 08", dot: "#8F8F8F", state: "T-2", textColor: "#0D0D0D", action: "Confirm report receipt" },
  { name: "HOA approval package", owner: "Seller", deadline: "Jul 11", dot: "#D0342C", state: "Prep overdue", textColor: "#D0342C", action: "Draft to association ready" },
  { name: "Title commitment", owner: "Title Co.", deadline: "Jul 22", dot: "#8F8F8F", state: "Pending", textColor: "#0D0D0D", action: "—" },
  { name: "Insurance binder", owner: "Buyer", deadline: "Jul 29", dot: "#8F8F8F", state: "Pending", textColor: "#0D0D0D", action: "—" },
  { name: "Walk-through", owner: "Buyer", deadline: "Aug 13", dot: "#8F8F8F", state: "Pending", textColor: "#0D0D0D", action: "—" },
  { name: "Closing statement review", owner: "TC", deadline: "Aug 14", dot: "#8F8F8F", state: "Pending", textColor: "#0D0D0D", action: "—" },
  { name: "CDA", owner: "Brokerage", deadline: "Aug 15", dot: "#8F8F8F", state: "Pending", textColor: "#0D0D0D", action: "—" },
];

const GRID = "2fr 1.1fr 0.9fr 0.7fr 2fr";

export function Transactions() {
  const navigate = useNavigate();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 48px", borderBottom: "1px solid #E3E3E3" }}>
        <div onClick={() => navigate("/opportunities")} className="tc-back" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5D5D5D", transition: "color 150ms" }}>‹ Pipeline · Under Contract</div>
        <div onClick={() => navigate("/opportunities")} className="tc-openrec" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Open deal record</div>
      </div>

      <div style={{ padding: "28px 48px 60px" }}>
        {/* alert */}
        <div style={{ border: "1px solid #E3E3E3", borderLeft: "2px solid #303030", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#303030" }} />
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030" }}>2 milestones inside the T-3 window.</span>
        </div>

        {/* header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "1px solid #E3E3E3", paddingBottom: 22 }}>
          <div>
            <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 20, color: "#0D0D0D" }}>Sterling · Acqualina 4802</div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0D0D0D" }} />
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5D5D5D" }}>Under Contract · Cash</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 36 }}>
            <div><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Effective</span><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#303030", marginTop: 5 }}>June 24</div></div>
            <div><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Closing</span><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#303030", marginTop: 5 }}>August 15</div></div>
          </div>
        </div>

        {/* milestone table */}
        <div style={{ marginTop: 30, border: "1px solid #E3E3E3" }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, padding: "13px 22px", background: "rgba(255,255,255,0.55)", borderBottom: "1px solid #E3E3E3" }}>
            {TC_HEAD.map((h) => <div key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</div>)}
          </div>
          {MILESTONES.map((m) => (
            <div key={m.name} style={{ display: "grid", gridTemplateColumns: GRID, padding: "16px 22px", borderBottom: "1px solid #E3E3E3", alignItems: "center" }}>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: m.textColor }}>{m.name}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{m.owner}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#303030" }}>{m.deadline}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flex: "none" }} />
                <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F" }}>{m.state}</span>
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D" }}>{m.action}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
