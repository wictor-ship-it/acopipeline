import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCollection } from "../../data/hooks";
import { getById, save } from "../../data/repository";
import type { Contact, Mandate, Opportunity } from "../../domain/types";
import { SANS, CONTACT_TOUCHES } from "../contacts/data";
import {
  CANON_STATUS, CHAT_CHIPS, CRITERIA, ESSENCE, JOURNEY_IDX, JOURNEY_SEQ,
  PINNED, RELATED, SINCE_LINE, toCanonStatus,
} from "./data";
import "./ContactDetail.css";

/* ================= SCREEN · CONTACT DETAIL (fragment 08) =================
   Locked grammar (CLAUDE.md): pinned header (status-select + type + vitals
   QTR/1YR + referral line) · segments Profile · Now · Agent. */

const initialsOf = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

type ChatMsg = { who: "a" | "u"; txt: string };

export function ContactDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { items: contacts } = useCollection<Contact>("contacts");
  const { items: opportunities } = useCollection<Opportunity>("opportunities");
  const { items: mandates } = useCollection<Mandate>("mandates");

  const [seg, setSeg] = useState<"profile" | "now" | "agent">("now");
  const [mandateText, setMandateText] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");

  const ct = contacts.find((c) => c.id === id);
  const deals = useMemo(() => opportunities.filter((o) => o.contact_id === id), [opportunities, id]);
  const mandate = mandates.find((m) => m.contact_id === id);
  const touches = CONTACT_TOUCHES[id] ?? [];

  if (!ct) return <div style={{ padding: "40px 48px", fontFamily: SANS, color: "#8F8F8F" }}>Contact not found. <span onClick={() => navigate("/contacts")} style={{ color: "#0D0D0D", cursor: "pointer", textDecoration: "underline" }}>Back to Contacts</span></div>;

  const typeVal = (ct.relationship ?? "").split("·")[0].trim() || ct.category;
  const essence = ESSENCE[id] ?? (ct.narrative ?? "").split(". ").slice(0, 1).join(".") + ".";
  const won = parseInt(ct.deals_won ?? "0", 10) || 0;
  const active = parseInt(ct.active_deals ?? "0", 10) || 0;
  const q7 = touches.length;
  const qtr7 = q7 + won * 2 + 2;
  const yr7 = qtr7 + won * 6 + 4;

  const headStats = [
    { label: "Lifetime GCI", value: ct.lifetime_gci ?? "—", periods: [] as Array<{ p: string; v: string }>, sub: "" },
    { label: "Last Contact", value: ct.last_touch ?? "—", periods: [], sub: "" },
    { label: "Active Deals", value: String(active), periods: [{ p: "QTR", v: `↑+${active}` }, { p: "1 YR", v: `↑+${active + won}` }], sub: deals.length ? `${deals[0].budget} · ${deals[0].stage}` : "no live pipeline" },
    { label: "Interactions", value: String(yr7 + 9), periods: [{ p: "QTR", v: `↑+${qtr7}` }, { p: "1 YR", v: `↑+${yr7}` }], sub: "" },
  ];

  const journeyIdx = JOURNEY_IDX[id] ?? 1;
  const pinned = PINNED[id] ?? [];
  const related = RELATED[id] ?? [{ name: "No related contacts yet", role: "", note: "Link family, attorneys, referral partners" }];
  const criteria = CRITERIA[id] ?? (ct.preferences?.asset ? [["Budget", (ct.preferences.budget as string) ?? "—"], ["Areas", (ct.preferences.areas as string) ?? "—"], ["Type", (ct.preferences.asset as string) ?? "—"]] as Array<[string, string]> : []);
  const hasRef = !!ct.referral_of;
  const refBy = contacts.find((c) => c.id === ct.referral_of)?.name ?? "";

  const currentMandate = mandateText ?? mandate?.text ?? "";
  const saveMandate = () => {
    const text = mandateText ?? "";
    if (!mandate || text === mandate.text) return;
    void save<Mandate>("mandates", { ...mandate, text, updated_at: "2026-07-06" }, { actor: "user", action: `Edited mandate — ${ct.name}` });
  };

  const sendChat = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    const reply = `Noted on ${ct.name.split(" ")[0]}. This stays in the file — nothing reaches ${ct.name.split(" ")[0]} without your approval. I will surface a proposal in Needs Your Decision.`;
    setChat((prev) => [...prev, { who: "u", txt: t }, { who: "a", txt: reply }]);
    setChatInput("");
  };

  const statusVal = toCanonStatus(ct.status);
  const onStatus = (v: string) => {
    if (v === statusVal) return;
    void getById<Contact>("contacts", id).then((cur) => { if (cur) void save<Contact>("contacts", { ...cur, directory_status: v }, { actor: "user", skill: "chief_of_staff", action: `Status → ${v} — ${ct.name} · follow-up cadence armed` }); });
  };

  return (
    <div>
      {/* PINNED IDENTITY + STATS */}
      <div className="cd-sticky">
        <div style={{ padding: "20px 48px 16px", borderBottom: "1px solid #E3E3E3" }}>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8F8F8F" }}>{typeVal} · {ct.location} · since {ct.since} <span onClick={() => setSeg("profile")} className="cd-editlink" style={{ cursor: "pointer", color: "#C9C7C1" }}>· edit ›</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 4 }}>
            <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 28, letterSpacing: "-0.01em", color: "#0D0D0D" }}>{ct.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ct.dot ?? "#8F8F8F" }} />
              <select defaultValue={statusVal} onChange={(e) => onStatus(e.target.value)} title="Status — changing it arms the default follow-up cadence" className="cd-status" style={{ appearance: "none", WebkitAppearance: "none", background: "transparent", border: "none", padding: "1px 0", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5D5D5D", outline: "none", cursor: "pointer" }}>
                {CANON_STATUS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginTop: 7 }}>
            {[ct.phone, ct.email, ct.spouse ? `Spouse · ${ct.spouse}` : null].filter(Boolean).map((v) => (
              <span key={v} onClick={() => navigator.clipboard?.writeText(String(v))} title="Click to copy" className="cd-copy" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, letterSpacing: "0.01em", color: "#5D5D5D", cursor: "pointer", transition: "color 150ms" }}>{v}</span>
            ))}
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: "#5D5D5D", marginTop: 8, maxWidth: 560 }}>{essence}</div>
          {hasRef && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 9, padding: "2px 0" }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: "#10A37F" }} />
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#303030" }}>Referral — <span style={{ fontWeight: 600, color: "#0D0D0D" }}>{refBy}</span> · registered Mar 2026 · protected to Mar 2027</span>
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5D5D5D", border: "1px solid #E3E3E3", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>fee 25% · §6</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid #E3E3E3", marginTop: 16 }}>
            {headStats.map((s, i) => (
              <div key={s.label} style={{ padding: `14px 24px 14px ${i === 0 ? "0" : "24px"}`, borderRight: i < 3 ? "1px solid #E3E3E3" : "none" }}>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", whiteSpace: "nowrap" }}>{s.label}</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                  <div style={{ fontFamily: SANS, fontWeight: 200, fontSize: 24, color: "#0D0D0D", paddingTop: 5 }}>{s.value}</div>
                  {s.periods.length > 0 && (
                    <div style={{ display: "flex", gap: 16, paddingBottom: 3 }}>
                      {s.periods.map((pp) => (
                        <div key={pp.p}>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", whiteSpace: "nowrap" }}>{pp.p}</div>
                          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, color: "#10A37F", paddingTop: 2, whiteSpace: "nowrap" }}>{pp.v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {s.sub && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 9.5, color: "#B8B8B8", paddingTop: 3, whiteSpace: "nowrap" }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEGMENTED NAV */}
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 48px 0" }}>
        <div className="cd-segbar" style={{ display: "flex", alignItems: "center", gap: 2, borderRadius: 999, padding: 3 }}>
          {(["profile", "now", "agent"] as const).map((sg) => {
            const label = sg === "profile" ? "Profile" : sg === "now" ? "Now" : "Agent";
            const on = seg === sg;
            return <div key={sg} onClick={() => setSeg(sg)} style={{ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 12.5, letterSpacing: "0.04em", color: on ? "#0D0D0D" : "#8F8F8F", padding: "7px 20px", borderRadius: 999, background: on ? "rgba(255,255,255,0.8)" : "transparent", boxShadow: on ? "0 2px 8px rgba(0,0,0,0.06)" : "none", cursor: "pointer", userSelect: "none", transition: "all 150ms", whiteSpace: "nowrap" }}>{label}</div>;
          })}
        </div>
      </div>

      {/* ===== NOW ===== */}
      {seg === "now" && (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "26px 48px 90px" }}>
          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: "#5D5D5D" }}>{SINCE_LINE[id] ?? "Since your last visit: no new activity — cadence clock running."}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 0, flexWrap: "wrap", marginTop: 16 }}>
            {JOURNEY_SEQ.map((label, i) => (
              <span key={label} style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontFamily: SANS, fontWeight: i === journeyIdx ? 400 : 300, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: i > journeyIdx ? "#8F8F8F" : "#0D0D0D", paddingBottom: 7, borderBottom: `2px solid ${i === journeyIdx ? "#0D0D0D" : "transparent"}` }}>{i < journeyIdx ? "✓ " : ""}{label}</span>
                {i < JOURNEY_SEQ.length - 1 && <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 12, color: "#C7C7C7", padding: "0 8px 7px" }}>·</span>}
              </span>
            ))}
          </div>

          {ct.agent_note && (
            <div className="cd-onething" style={{ borderRadius: 12, borderLeft: "2px solid #0D0D0D", padding: "18px 22px", marginTop: 24 }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5D5D5D" }}>The one thing</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 15, lineHeight: 1.55, color: "#0D0D0D", marginTop: 8 }}>{ct.agent_note}</div>
            </div>
          )}

          {pinned.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              {pinned.map((p) => <span key={p} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", border: "1px solid #D9D9D9", borderRadius: 999, padding: "5px 13px" }}>{p}</span>)}
            </div>
          )}

          {criteria.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D", paddingBottom: 11, borderBottom: "1px solid #E3E3E3", marginBottom: 4 }}>Search criteria</div>
              {criteria.map(([l, v]) => (
                <div key={l} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "11px 0", borderBottom: "1px solid #E3E3E3" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8F8F8F" }}>{l}</span>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#303030", textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 30 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D", paddingBottom: 11, borderBottom: "1px solid #E3E3E3", marginBottom: 4 }}>Related contacts</div>
            {related.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #E3E3E3" }}>
                <span className="cd-avatar" style={{ width: 30, height: 30, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, fontFamily: SANS, fontWeight: 500, fontSize: 10.5, color: "#5D5D5D" }}>{initialsOf(r.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13.5, color: "#0D0D0D" }}>{r.name}{r.role && <span style={{ fontWeight: 400, color: "#8F8F8F" }}> · {r.role}</span>}</div>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#5D5D5D", marginTop: 2 }}>{r.note}</div>
                </div>
              </div>
            ))}
          </div>

          {touches.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D", paddingBottom: 11, borderBottom: "1px solid #E3E3E3", marginBottom: 4 }}>Recent touches</div>
              {touches.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 16, padding: "11px 0", borderBottom: "1px solid #E3E3E3" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", flex: "none", width: 56 }}>{a.date}</span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5D5D5D" }}>{a.type}</span>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: "#303030", marginTop: 2 }}>{a.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== PROFILE ===== */}
      {seg === "profile" && (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "30px 48px 90px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10A37F", flex: "none" }} />
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>Agent's Mandate <span style={{ color: "#10A37F" }}>· active</span></span>
          </div>
          <textarea
            value={currentMandate}
            onChange={(e) => setMandateText(e.target.value)}
            onBlur={saveMandate}
            rows={4}
            placeholder="Profile, objective and goals for this relationship — e.g. 'UHNW buyer relocating from SP. Goal: oceanfront primary residence, $15–20M, close by Q4. Prefers Rivage / Bal Harbour. Introduce tax attorney before contract.'"
            className="cd-mandate"
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #D9D9D9", background: "rgba(250,250,250,0.5)", padding: "12px 14px", marginTop: 12, fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: "#303030", outline: "none", resize: "vertical" }}
          />

          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D", paddingBottom: 11, borderBottom: "1px solid #E3E3E3", margin: "34px 0 4px" }}>Contact information</div>
          {[["Type", typeVal], ["Location", ct.location ?? "—"], ["Phone · WhatsApp", ct.phone ?? "—"], ["Email", ct.email ?? "—"], ["Client since", ct.since ?? "—"], ["Language", (ct.language ?? []).join(" · ") || "—"], ["Lifetime GCI", ct.lifetime_gci ?? "—"], ["Deals won", ct.deals_won ?? "—"]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "12px 0", borderBottom: "1px solid #E3E3E3" }}>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8F8F8F" }}>{l}</span>
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#303030", textAlign: "right" }}>{v}</span>
            </div>
          ))}

          {(ct.tags?.length ?? 0) > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
              {ct.tags!.map((t) => <span key={t} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", border: "1px solid #D9D9D9", borderRadius: 999, padding: "5px 13px" }}>{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* ===== AGENT ===== */}
      {seg === "agent" && (
        <div style={{ padding: "26px 48px 42px", maxWidth: 1020 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start", maxWidth: 780 }}>
              <span style={{ width: 7, height: 7, flex: "none", borderRadius: "50%", background: "#0D0D0D", marginTop: 8 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 8.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8F8F8F" }}>A/CO Agent · this relationship</div>
                <div className="cd-abubble" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.65, color: "#303030", borderRadius: "4px 16px 16px 16px", padding: "13px 18px", marginTop: 6 }}>File loaded — {ct.name}: {ct.relationship} · {ct.status} · {touches.length} touches · speaks {(ct.language ?? []).join("/")}. Ask me anything on this relationship — strategy, next move, drafts, matching. Analysis stays here; nothing reaches {ct.name.split(" ")[0]} without your approval.</div>
              </div>
            </div>
            {chat.map((m, i) => m.who === "a" ? (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", maxWidth: 780 }}>
                <span style={{ width: 7, height: 7, flex: "none", borderRadius: "50%", background: "#0D0D0D", marginTop: 8 }} />
                <div className="cd-abubble" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.65, color: "#303030", borderRadius: "4px 16px 16px 16px", padding: "13px 18px", marginTop: 6 }}>{m.txt}</div>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.6, color: "#FFFFFF", background: "#0D0D0D", borderRadius: "16px 4px 16px 16px", padding: "12px 17px", maxWidth: 560 }}>{m.txt}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 24 }}>
            {CHAT_CHIPS.map((c) => <span key={c} onClick={() => sendChat(c)} className="cd-chip" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#303030", border: "1px solid #E3E3E3", borderRadius: 999, padding: "6px 13px", cursor: "pointer", transition: "all 150ms", whiteSpace: "nowrap" }}>{c}</span>)}
          </div>
          <div className="cd-composer" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, borderRadius: 28, padding: "8px 8px 8px 22px" }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(chatInput); }} placeholder="Ask about this relationship — strategy, next move, matching, expansion…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D" }} />
            <button onClick={() => sendChat(chatInput)} className="cd-send" style={{ width: 38, height: 38, borderRadius: "50%", background: "#E9E8E4", border: "1px solid #E0DFDA", color: "#0D0D0D", fontSize: 15, cursor: "pointer", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 150ms" }}>↑</button>
          </div>
        </div>
      )}
    </div>
  );
}
