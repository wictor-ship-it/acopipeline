import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recordAction } from "../../data/repository";
import { SANS } from "../contacts/data";
import { ASK_CHIPS, askSubmit, HOME_REMINDERS, SCREEN_ROUTE, type AskAction, type AskAnswer } from "./ask";
import "./Command.css";

/* ================= SCREEN 1 · COMMAND CENTER (fragment 01) ================= */

export function Command() {
  const navigate = useNavigate();
  const [askText, setAskText] = useState("");
  const [thread, setThread] = useState<AskAnswer[]>([]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const ans = askSubmit(t);
    if (ans.audit) void recordAction({ actor: "agent", skill: "chief_of_staff", action: ans.audit }, "command", () => {});
    setThread((prev) => [ans, ...prev].slice(0, 6));
    setAskText("");
  };

  const goAction = (a: AskAction) => { if (a.contact) navigate(`/contacts/${a.contact}`); else if (a.screen) navigate(SCREEN_ROUTE[a.screen]); };

  return (
    <div style={{ padding: "0 0 60px" }}>
      {/* CONVERSATIONAL HERO */}
      <div style={{ padding: "0 48px", minHeight: "calc(100vh - 210px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 22, color: "#0D0D0D", textAlign: "center" }}>Good morning, Wictor. <span style={{ fontWeight: 400, color: "#5D5D5D" }}>3 decisions, 5 touches, 1 risk.</span></div>

        <div className="cc-askbar" style={{ display: "flex", alignItems: "center", gap: 14, borderRadius: 999, padding: "12px 14px 12px 20px", marginTop: 22, width: "min(720px,92%)" }}>
          <span className="cc-plus" title="Upload contract / document — agent extracts terms" style={{ fontFamily: SANS, fontWeight: 300, fontSize: 17, color: "#8F8F8F", flex: "none", cursor: "pointer", transition: "color 150ms" }}>+</span>
          <input value={askText} onChange={(e) => setAskText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(askText); }} placeholder={'Ask, command or dictate — "log a call with Marcelo, it advanced"'} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#0D0D0D" }} />
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", color: "#8F8F8F", flex: "none" }}>V</span>
          <div className="cc-mic" title="Speak · V" style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 150ms", border: "0.5px solid #0D0D0D", background: "#0D0D0D", color: "#FFFFFF", fontSize: 13 }}>🎙</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 14 }}>
          {ASK_CHIPS.map((label) => (
            <span key={label} onClick={() => label === "Touch queue" ? navigate("/contacts?view=queue") : submit(label)} className="cc-chip" style={{ whiteSpace: "nowrap", fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#5D5D5D", borderRadius: 12, padding: "7px 14px", cursor: "pointer", transition: "all 150ms" }}>{label}</span>
          ))}
        </div>

        {/* RESPONSE THREAD */}
        {thread.length > 0 && (
          <div style={{ width: "min(720px,92%)", marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {thread.map((t, i) => (
              <div key={i} className="cc-answer" style={{ borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#8F8F8F" }}>“{t.q}”</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14.5, lineHeight: 1.65, color: "#303030", marginTop: 8 }}>{t.a}</div>

                {t.rich?.kind === "chart" && (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 14 }}>
                      {t.rich.bars!.map((b) => (
                        <div key={b.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                          <div style={{ width: "100%", height: 44, display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%", height: b.h, minHeight: 2, background: b.on ? "#0D0D0D" : "#D8D8D8" }} /></div>
                          <span style={{ fontFamily: SANS, fontWeight: b.on ? 600 : 400, fontSize: 9, letterSpacing: "0.06em", color: b.on ? "#0D0D0D" : "#8F8F8F" }}>{b.m}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px solid #E3E3E3", marginTop: 10 }}>
                      {t.rich.rows!.map((r) => (
                        <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "7px 2px", borderBottom: "1px solid #E3E3E3" }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#303030" }}>{r.name}</span>
                          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12.5, color: "#0D0D0D" }}>{r.value}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "flex-end", padding: "7px 2px 0", fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D" }}>{t.rich.total}</div>
                    </div>
                  </>
                )}

                {t.rich?.kind === "list" && (
                  <div style={{ borderTop: "1px solid #E3E3E3", marginTop: 12 }}>
                    {t.rich.rows!.map((r) => (
                      <div key={r.name} onClick={() => { if (r.contact) navigate(`/contacts/${r.contact}`); else if (r.screen) navigate(SCREEN_ROUTE[r.screen as keyof typeof SCREEN_ROUTE]); }} className="cc-listrow" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", borderBottom: "1px solid #E3E3E3", cursor: "pointer", transition: "background 150ms" }}>
                        <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: r.dot }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{r.name}</div>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.note}</div>
                        </div>
                        {r.value && <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#0D0D0D", flex: "none" }}>{r.value}</span>}
                        <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 12, color: "#8F8F8F", flex: "none" }}>→</span>
                      </div>
                    ))}
                  </div>
                )}

                {t.rich?.kind === "deal" && (
                  <div style={{ border: "1px solid #E3E3E3", marginTop: 12 }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #E3E3E3", background: "rgba(255,255,255,0.55)" }}>
                      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13.5, color: "#0D0D0D" }}>{t.rich.title}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", marginTop: 3 }}>{t.rich.sub}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                      {t.rich.stats!.map((st, j) => (
                        <div key={st.l} style={{ padding: "10px 16px", borderRight: j < 2 ? "1px solid #E3E3E3" : "none" }}>
                          <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F" }}>{st.l}</div>
                          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D", marginTop: 4 }}>{st.v}</div>
                        </div>
                      ))}
                    </div>
                    {t.rich.alert && <div style={{ borderTop: "1px solid #E3E3E3", borderLeft: "2px solid #D0342C", padding: "9px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#D0342C" }}>{t.rich.alert}</div>}
                  </div>
                )}

                {t.rich?.kind === "stats" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 28px", marginTop: 14 }}>
                    {t.rich.rows!.map((f) => (
                      <div key={f.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#5D5D5D" }}>{f.label}</span>
                          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11, color: "#0D0D0D" }}>{f.value}</span>
                        </div>
                        <div style={{ height: 2, background: "#E3E3E3" }}><div style={{ height: 2, borderRadius: 999, width: f.w, background: "#0D0D0D" }} /></div>
                      </div>
                    ))}
                  </div>
                )}

                {t.actions.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {t.actions.map((ac) => (
                      <span key={ac.label} onClick={() => goAction(ac)} className="cc-action" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11.5, color: "#0D0D0D", border: "1px solid #D9D9D9", padding: "5px 12px", cursor: "pointer", transition: "background 150ms" }}>{ac.label}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div onClick={() => setThread([])} className="cc-clear" style={{ alignSelf: "center", fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", cursor: "pointer" }}>Clear</div>
          </div>
        )}
      </div>

      {/* CRITICAL REMINDERS */}
      <div style={{ width: "min(680px,88%)", margin: "30px auto 0", display: "flex", flexDirection: "column" }}>
        {HOME_REMINDERS.map((r) => (
          <div key={r.text} onClick={() => navigate(r.to)} className="cc-listrow" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 8px", borderBottom: "1px solid #E3E3E3", cursor: "pointer", transition: "background 150ms" }}>
            <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: r.dot }} />
            <span style={{ flex: 1, fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#303030" }}>{r.text}</span>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", flex: "none", whiteSpace: "nowrap" }}>{r.action} →</span>
          </div>
        ))}
        <div onClick={() => navigate("/intelligence")} className="cc-intel" style={{ alignSelf: "center", marginTop: 20, fontFamily: SANS, fontWeight: 500, fontSize: 12.5, letterSpacing: "0.03em", color: "#5D5D5D", cursor: "pointer", transition: "color 150ms" }}>Open Intelligence · daily cockpit →</div>
      </div>
    </div>
  );
}
