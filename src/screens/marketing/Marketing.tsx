import { useState } from "react";
import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import {
  CAL_WEEK, CAMP_KPIS, CAMPAIGNS, KANBAN, MATRIX, MKT, ONE_TO_ONE, SEGMENTS, SEQ, TRENDS,
} from "./data";
import "./Marketing.css";

/* ================= SCREEN · MARKETING (fragment 06) =================
   Four tabs: Campaigns · Content · Audiences · Trends. */

const TABS: Array<[string, string]> = [["Campaigns", "camp"], ["Content", "content"], ["Audiences", "aud"], ["Trends", "trends"]];
const CHANNELS = ["1 · WhatsApp", "2 · Instagram · auto-post", "3 · LinkedIn", "4 · Email"];

const H = ({ children }: { children: React.ReactNode }) => <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>{children}</span>;

export function Marketing() {
  const [tab, setTab] = useState("camp");
  const [approved, setApproved] = useState(false);

  const approve = () => { setApproved(true); void recordAction({ actor: "user", skill: "chief_of_staff", action: "Marketing · approved campaign — Rivage PH-A Off-market preview (agent runs the full sequence)" }, "campaign/rivage", () => setApproved(false)); };

  return (
    <div style={{ padding: "22px 48px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {TABS.map(([label, id]) => {
            const on = tab === id;
            return <div key={id} onClick={() => setTab(id)} style={{ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 13, color: on ? "#0D0D0D" : "#5D5D5D", background: on ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${on ? "#D9D9D9" : "transparent"}`, borderRadius: 999, padding: "7px 16px", cursor: "pointer", userSelect: "none", transition: "all 150ms" }}>{label}</div>;
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {CHANNELS.map((c) => <span key={c} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 11px", fontFamily: SANS, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5D5D5D" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10A37F" }} />{c}</span>)}
        </div>
      </div>

      {/* ===== CAMPAIGNS ===== */}
      {tab === "camp" && (
        <div style={{ marginTop: 22 }}>
          <div className="mk-kpigrid">
            {CAMP_KPIS.map((k) => (
              <div key={k.label} style={{ padding: "18px 20px", borderRight: "1px solid #E3E3E3" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{k.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 30, lineHeight: 1, color: k.label === "Awaiting approval" ? "#D0342C" : "#0D0D0D" }}>{k.value}</span>
                  <span style={{ fontFamily: SANS, fontSize: 11, color: k.deltaColor }}>{k.delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, border: "1px solid #E3E3E3", borderRadius: 10, background: "rgba(249,249,249,0.55)", padding: "12px 18px", marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", flex: "none" }}>WhatsApp rules</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: "#303030" }}><span style={{ color: "#D0342C", fontWeight: 600 }}>HOT</span> → 1:1, you approve each</span><span style={{ color: "#C7C7C7" }}>·</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: "#303030" }}><span style={{ color: "#B45309", fontWeight: 600 }}>WARM</span> → 1:1 by the agent, inside approved campaigns</span><span style={{ color: "#C7C7C7" }}>·</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: "#303030" }}><span style={{ color: "#5D5D5D", fontWeight: 600 }}>NURTURE</span> → segment broadcast</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F" }}>every send auto-localized to the contact's language</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, marginTop: 22, alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 12px" }}>
                <H>Active campaigns</H>
                <button className="mk-dark" style={{ background: "#0D0D0D", border: "none", borderRadius: 999, padding: "8px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#FFFFFF", cursor: "pointer" }}>+ New campaign</button>
              </div>
              <div className="mk-glass" style={{ borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1.3fr 1fr 1.1fr", padding: "11px 18px", background: "rgba(255,255,255,0.55)", borderBottom: "1px solid #E3E3E3" }}>
                  {["Campaign", "Audience", "Channels", "Status", "Sequence"].map((h) => <span key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</span>)}
                </div>
                {CAMPAIGNS.map((c) => {
                  const prog = c.name.startsWith("Rivage") && approved ? "20%" : c.prog;
                  const step = c.name.startsWith("Rivage") && approved ? "1/5" : c.step;
                  return (
                    <div key={c.name} className="mk-row" style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1.3fr 1fr 1.1fr", padding: "14px 18px", borderBottom: "1px solid #ECECEC", alignItems: "center", cursor: "pointer", transition: "background 150ms" }}>
                      <div><div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13.5, color: "#0D0D0D" }}>{c.name}</div><div style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F", marginTop: 2 }}>{c.type}</div></div>
                      <span style={{ fontFamily: SANS, fontSize: 12, color: "#5D5D5D" }}>{c.aud}</span>
                      <span style={{ fontFamily: SANS, fontSize: 10.5, letterSpacing: "0.03em", color: "#5D5D5D" }}>{c.ch}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: c.dot }} /><span style={{ fontFamily: SANS, fontSize: 11, color: c.stColor }}>{c.status}</span></div>
                      <div><div style={{ height: 3, background: "rgba(255,255,255,0.55)", borderRadius: 999 }}><div style={{ height: 3, borderRadius: 999, background: "#0D0D0D", width: prog }} /></div><div style={{ fontFamily: SANS, fontSize: 10.5, color: "#8F8F8F", marginTop: 4 }}>{step}</div></div>
                    </div>
                  );
                })}
              </div>

              {/* featured campaign */}
              <div style={{ border: "1px solid #E3E3E3", borderRadius: 12, marginTop: 22, overflow: "hidden", background: "rgba(255,255,255,0.62)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", background: "rgba(249,249,249,0.55)", borderBottom: "1px solid #ECECEC" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B45309" }} /><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "#0D0D0D" }}>Rivage PH-A — Off-market preview</span><span style={{ border: "1px solid #E3E3E3", borderRadius: 999, padding: "2px 9px", fontFamily: SANS, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5D5D5D", background: "rgba(255,255,255,0.62)" }}>Listing launch</span></div>
                    <div style={{ fontFamily: SANS, fontSize: 12, color: "#5D5D5D", marginTop: 4 }}>Audience: HOT · Acqualina corridor · 12 contacts (8 PT · 3 EN · 1 ES) — built from the pipeline, content localized per contact</div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <button onClick={approve} className={approved ? undefined : "mk-dark"} style={{ background: approved ? "#FFFFFF" : "#0D0D0D", border: `1px solid ${approved ? "#E3E3E3" : "#0D0D0D"}`, borderRadius: 999, padding: "10px 20px", fontFamily: SANS, fontWeight: 500, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: approved ? "#5D5D5D" : "#FFFFFF", cursor: approved ? "default" : "pointer" }}>{approved ? "Approved · running" : "Approve campaign"}</button>
                    <div style={{ fontFamily: SANS, fontSize: 10.5, color: "#8F8F8F", marginTop: 6 }}>approved once → the agent runs the full sequence</div>
                  </div>
                </div>
                <div style={{ display: "flex", padding: "18px 22px" }}>
                  {SEQ.map((s) => (
                    <div key={s.day} style={{ flex: 1, paddingRight: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: s.day === "D0" && approved ? MKT.G : s.dot }} /><div style={{ flex: 1, height: 1, background: "#E3E3E3" }} /></div>
                      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8F8F8F", marginTop: 9 }}>{s.day} · {s.chan}</div>
                      <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.45, color: "#303030", marginTop: 4 }}>{s.what}</div>
                      <div style={{ fontFamily: SANS, fontSize: 10.5, color: s.day === "D0" && approved ? MKT.G : s.stColor, marginTop: 4 }}>{s.day === "D0" && approved ? "executing" : s.st}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "0 22px 20px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12, color: "#0D0D0D" }}>WhatsApp 1:1 — drafts personalized per contact, in their language</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {ONE_TO_ONE.map((d) => (
                      <div key={d.name} style={{ border: "1px solid #E3E3E3", borderRadius: 10, padding: "12px 14px", background: "rgba(255,255,255,0.62)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, color: "#0D0D0D" }}>{d.name}</span><span style={{ fontFamily: SANS, fontSize: 9, letterSpacing: "0.06em", color: "#8F8F8F" }}>{d.meta}</span></div>
                        <div style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: 1.5, color: "#5D5D5D", marginTop: 6 }}>{d.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ border: "1px solid #E3E3E3", borderRadius: 12, padding: "18px 20px", background: "rgba(255,255,255,0.62)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12.5, color: "#0D0D0D" }}>Instagram · @arraes.miami</span><span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#10A37F" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10A37F" }} />connected</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                  {[["Followers", "18.4K", "+312 · 30d", "#10A37F"], ["Reach 30d", "84K", "62% non-followers", "#5D5D5D"], ["Saves", "1.2K", "top: market data", "#5D5D5D"]].map(([l, v, s, c]) => (
                    <div key={l}><div style={{ fontFamily: SANS, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F" }}>{l}</div><div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 19, color: "#0D0D0D", marginTop: 3 }}>{v}</div><div style={{ fontFamily: SANS, fontSize: 10, color: c }}>{s}</div></div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #ECECEC", marginTop: 14, paddingTop: 12 }}>
                  <span style={{ fontFamily: SANS, fontSize: 11.5, color: "#5D5D5D" }}>Auto-post by the agent</span>
                  <span style={{ width: 30, height: 16, borderRadius: 999, background: "#10A37F", position: "relative", display: "inline-block" }}><span style={{ position: "absolute", right: 2, top: 2, width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} /></span>
                </div>
              </div>
              <div style={{ border: "1px solid #E3E3E3", borderRadius: 12, padding: "18px 20px", background: "rgba(255,255,255,0.62)" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12.5, color: "#0D0D0D" }}>Trends → brief</span><span onClick={() => setTab("trends")} className="mk-radar" style={{ fontFamily: SANS, fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "#8F8F8F", cursor: "pointer" }}>Radar →</span></div>
                {[["Corridor PH inventory down 18% QoQ — scarcity story", "Market · touches 9 HOT"], ["Fed signals September cut — urgency window for cash buyers", "Macro · touches 14 contacts"], ['"Calm-voice walkthrough" format +34% saves in luxury RE', "Social · IG Reels"]].map(([t, m], i) => (
                  <div key={i} style={{ borderBottom: i < 2 ? "1px solid #ECECEC" : "none", paddingBottom: 12, marginTop: i > 0 ? 12 : 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.5, color: "#303030" }}>{t}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={{ fontFamily: SANS, fontSize: 10, color: "#8F8F8F" }}>{m}</span><span style={{ fontFamily: SANS, fontSize: 10.5, color: "#0D0D0D", cursor: "pointer" }}>→ Create campaign</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONTENT ===== */}
      {tab === "content" && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <H>Content calendar</H>
            <div style={{ display: "flex", gap: 12, fontFamily: SANS, fontSize: 10.5, color: "#5D5D5D" }}>
              {[["WhatsApp", MKT.G], ["Instagram", MKT.IG], ["LinkedIn", MKT.LI], ["Email", MKT.GR]].map(([l, c]) => <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />{l}</span>)}
            </div>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F" }}>● approved · ◐ agent draft · ○ brief</span>
            <span style={{ fontFamily: SANS, fontSize: 11.5, color: "#303030" }}>Jul 06 – Jul 12</span>
          </div>
          <div className="mk-glass" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderRadius: 10, overflow: "hidden" }}>
            {CAL_WEEK.map((d) => (
              <div key={d.day} style={{ borderRight: "1px solid #ECECEC", borderBottom: "1px solid #ECECEC", minHeight: 138, padding: 10, background: d.hl ? "rgba(255,255,255,0.5)" : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F" }}>{d.day}</span><span style={{ fontFamily: SANS, fontSize: 10, color: "#C7C7C7" }}>{d.n}</span></div>
                {d.posts.map((p, i) => (
                  <div key={i} className="mk-post" style={{ border: "1px solid #E3E3E3", borderRadius: 8, padding: "7px 9px", marginTop: 8, background: "rgba(249,249,249,0.55)", cursor: "pointer", transition: "box-shadow 150ms" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: p.dot }} /><span style={{ fontFamily: SANS, fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D" }}>{p.chan} · {p.lang}</span><span style={{ flex: 1 }} /><span style={{ fontFamily: SANS, fontSize: 9, color: "#8F8F8F" }}>{p.st}</span></div>
                    <div style={{ fontFamily: SANS, fontSize: 11, lineHeight: 1.4, color: "#303030", marginTop: 4 }}>{p.title}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ border: "1px solid #E3E3E3", borderRadius: 12, background: "rgba(255,255,255,0.62)", padding: "18px 20px", marginTop: 24 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Composer · brief from the radar — hook</div>
            <div style={{ fontFamily: SANS, fontSize: 13.5, color: "#0D0D0D", marginTop: 6 }}>"The last penthouse in the corridor with double-height ceilings — and why it's gone in 30 days."</div>
            <div style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: "#303030", marginTop: 12 }}>Penthouse inventory in the Acqualina–Rivage corridor fell 18% this quarter. One double-height unit left. In the comments: what $2,610/SF buys here vs Bal Harbour.</div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F", marginTop: 8 }}>#MiamiLuxuryRealEstate #SunnyIslesBeach #PenthouseMiami #OffMarket +6</div>
          </div>
        </div>
      )}

      {/* ===== AUDIENCES ===== */}
      {tab === "aud" && (
        <div style={{ marginTop: 22 }}>
          <div style={{ border: "1px solid #E3E3E3", borderRadius: 12, background: "rgba(249,249,249,0.55)", padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: "#0D0D0D" }}>Language intelligence</div>
                <div style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: "#5D5D5D", marginTop: 4, maxWidth: 720 }}>The agent detects each contact's native language from message replies, email locale and phone country, registers it on the contact record, and localizes every campaign send automatically. You write once — each contact reads it in their language.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                {[["EN · 41", false], ["PT · 32", false], ["ES · 6", false], ["3 unconfirmed → review", true]].map(([l, warn]) => <span key={l as string} style={{ border: `1px solid ${warn ? "#D0342C" : "#E3E3E3"}`, borderRadius: 999, padding: "6px 13px", fontFamily: SANS, fontSize: 11, color: warn ? "#D0342C" : "#303030", background: "rgba(255,255,255,0.62)", cursor: warn ? "pointer" : "default" }}>{l as string}</span>)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "24px 0 12px" }}><H>Live segments — built from pipeline &amp; contacts</H><span style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F" }}>stage × interest × behavior × language · refreshed on every sync</span></div>
          <div className="mk-glass" style={{ borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 2fr 0.7fr 1fr 1.4fr", padding: "11px 18px", background: "rgba(255,255,255,0.55)", borderBottom: "1px solid #E3E3E3" }}>
              {["Segment", "Definition", "Contacts", "Languages", "Last campaign"].map((h) => <span key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{h}</span>)}
            </div>
            {SEGMENTS.map((s) => (
              <div key={s.name} className="mk-row" style={{ display: "grid", gridTemplateColumns: "1.6fr 2fr 0.7fr 1fr 1.4fr", padding: "14px 18px", borderBottom: "1px solid #ECECEC", alignItems: "baseline", cursor: "pointer", transition: "background 150ms" }}>
                <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{s.name}</span>
                <span style={{ fontFamily: SANS, fontSize: 12, color: "#5D5D5D" }}>{s.def}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, color: "#303030" }}>{s.n}</span>
                <span style={{ fontFamily: SANS, fontSize: 11.5, color: "#5D5D5D" }}>{s.langs}</span>
                <span style={{ fontFamily: SANS, fontSize: 11.5, color: "#8F8F8F" }}>{s.last}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "28px 0 12px" }}><H>Matrix — stage × interest</H><span style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F" }}>live counts · click a cell to start a campaign</span></div>
          <div className="mk-glass" style={{ borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", padding: "11px 18px", background: "rgba(255,255,255,0.55)", borderBottom: "1px solid #E3E3E3" }}>
              {[["Interest", "#8F8F8F"], ["HOT", "#D0342C"], ["WARM", "#B45309"], ["Nurture", "#8F8F8F"], ["Languages", "#8F8F8F"]].map(([h, c]) => <span key={h} style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: c }}>{h}</span>)}
            </div>
            {MATRIX.map((r) => (
              <div key={r.int} className="mk-row" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", padding: "13px 18px", borderBottom: "1px solid #ECECEC", alignItems: "baseline", cursor: "pointer", transition: "background 150ms" }}>
                <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{r.int}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, color: "#303030" }}>{r.hot}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, color: "#303030" }}>{r.warm}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, color: "#303030" }}>{r.nur}</span>
                <span style={{ fontFamily: SANS, fontSize: 11.5, color: "#8F8F8F" }}>{r.langs}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== TRENDS ===== */}
      {tab === "trends" && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}><H>Radar — signals ranked by relevance to your pipeline</H><span style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F" }}>refreshed daily · 6 AM · with the brief</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TRENDS.map((t) => (
              <div key={t.title} style={{ border: "1px solid #E3E3E3", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, background: "rgba(255,255,255,0.62)" }}>
                <span style={{ flex: "none", border: "1px solid #E3E3E3", borderRadius: 999, padding: "3px 10px", fontFamily: SANS, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", background: "rgba(249,249,249,0.55)" }}>{t.src}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: SANS, fontSize: 13.5, color: "#0D0D0D" }}>{t.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}><div style={{ width: 120, height: 2, background: "rgba(255,255,255,0.55)", borderRadius: 999 }}><div style={{ height: 2, borderRadius: 999, background: "#0D0D0D", width: t.rel }} /></div><span style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F" }}>{t.why}</span></div>
                </div>
                <button className="mk-outline" style={{ flex: "none", background: "transparent", border: "1px solid #0D0D0D", borderRadius: 999, padding: "7px 15px", fontFamily: SANS, fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "background 150ms" }}>Generate brief</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}><H>Production flow — brief → live</H><span style={{ fontFamily: SANS, fontSize: 11, color: "#8F8F8F" }}>once a campaign is approved, the agent moves the cards</span></div>
          <div style={{ display: "grid", overflowX: "auto", gridTemplateColumns: "repeat(5,minmax(170px,1fr))", gap: 12 }}>
            {KANBAN.map((k) => (
              <div key={k.col} style={{ border: "1px solid #E3E3E3", borderRadius: 12, background: "rgba(249,249,249,0.55)", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}>{k.col}</span><span style={{ fontFamily: SANS, fontSize: 10.5, color: "#8F8F8F" }}>{k.n}</span></div>
                {k.cards.map((c, i) => (
                  <div key={i} className="mk-post" style={{ border: "1px solid #E3E3E3", borderRadius: 9, background: "rgba(255,255,255,0.62)", padding: "10px 12px", marginBottom: 8, cursor: "pointer", transition: "box-shadow 150ms" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: c.dot }} /><span style={{ fontFamily: SANS, fontSize: 8.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>{c.chan}</span></div>
                    <div style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: 1.4, color: "#303030", marginTop: 5 }}>{c.title}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
