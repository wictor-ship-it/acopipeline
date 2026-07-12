import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "../../data/hooks";
import { newId, save } from "../../data/repository";
import type { Message, Thread } from "../../domain/types";
import { useAppState } from "../../app/state";
import { fetchGmailThreads, fetchGmailThread, type GmailThread, type GmailThreadDetail } from "../../data/adapters/gmail";
import { SANS } from "../contacts/data";
import "./Inbox.css";

/* Live Gmail strip (Phase 2) — appears only when Google is connected via the
   BFF. Read-only; the seeded two-pane below is untouched. Full Gmail threading
   into the conversation view is the next step. */
function GmailLiveStrip() {
  const { google } = useAppState();
  const [threads, setThreads] = useState<GmailThread[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!google.connected) return;
    setLoading(true);
    let alive = true;
    void fetchGmailThreads(5).then((t) => { if (alive) { setThreads(t); setLoading(false); } });
    return () => { alive = false; };
  }, [google.connected]);
  const [open, setOpen] = useState<GmailThreadDetail | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const openThread = async (id: string) => {
    setOpenId(id); setLoadingThread(true); setOpen(null);
    const d = await fetchGmailThread(id);
    setLoadingThread(false); setOpen(d);
  };
  if (!google.connected) return null;
  return (
    <div style={{ border: "1px solid #E3E3E3", borderLeft: "2px solid #10A37F", borderRadius: 12, background: "rgba(255,255,255,0.55)", padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10A37F" }} />
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10A37F" }}>Gmail · live</span>
        <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{loading ? "reading your inbox…" : threads === null ? "read failed — reconnect in Settings" : `${threads.length} recent thread${threads.length === 1 ? "" : "s"} · read-only · click to open`}</span>
      </div>
      {threads && threads.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {threads.map((t) => (
            <div key={t.id} onClick={() => void openThread(t.id)} className="ib-liverow" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "6px 4px", borderTop: "1px solid #ECECEC", cursor: "pointer", borderRadius: 6 }}>
              <span style={{ flex: "none", width: 180, fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.from || "—"}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 400, fontSize: 12.5, color: "#303030", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject || t.snippet || "(no subject)"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Read-only thread drawer */}
      {openId && (
        <>
          <div onClick={() => { setOpenId(null); setOpen(null); }} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.32)" }} />
          <div className="ib-livedrawer">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "22px 26px 16px", borderBottom: "1px solid #E3E3E3" }}>
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: "#0D0D0D" }}>{open?.messages[0]?.subject || "Gmail thread"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10A37F" }} />
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#10A37F" }}>Live · Gmail · read-only</span>
                </div>
              </div>
              <span onClick={() => { setOpenId(null); setOpen(null); }} style={{ fontFamily: SANS, fontWeight: 200, fontSize: 20, color: "#8F8F8F", cursor: "pointer", lineHeight: 1 }}>×</span>
            </div>
            <div style={{ padding: "18px 26px 40px", display: "flex", flexDirection: "column", gap: 14 }}>
              {loadingThread && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F" }}>Loading…</div>}
              {open && open.messages.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F" }}>No readable content in this thread.</div>}
              {open?.messages.map((m) => {
                const out = m.dir === "out";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                    <div className={out ? "ib-bubble-out" : "ib-bubble-in"} style={{ maxWidth: "88%", padding: "11px 15px", borderRadius: out ? "18px 18px 6px 18px" : "18px 18px 18px 6px" }}>
                      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 10.5, color: out ? "rgba(255,255,255,0.75)" : "#8F8F8F", marginBottom: 4 }}>{m.from}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.55, color: out ? "#FFFFFF" : "#303030", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, color: out ? "rgba(255,255,255,0.6)" : "#8F8F8F", marginTop: 6, textAlign: "right" }}>{m.date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= SCREEN · INBOX · MESSAGE CENTER (fragment 15) =================
   Left thread list + right conversation, over the seeded threads/messages.
   Quick replies are language-aware (qrSets ~3315). */

const CH_LABEL: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", sms: "SMS" };
const CH_FILTERS: Array<[string, string]> = [["All", "all"], ["WhatsApp", "whatsapp"], ["Email", "email"], ["SMS", "sms"]];

const QR_LANG: Record<string, string> = { marcelo: "PT", bittencourt: "PT", alvarez: "ES" };
function quickReplies(lang: string, first: string): Array<[string, string]> {
  const sets: Record<string, Array<[string, string]>> = {
    PT: [["Confirmar", `${first} — confirmado! Sábado 11h, encontro vocês no lobby.`], ["Enviar docs", `${first} — enviando agora o cronograma e os documentos. Qualquer dúvida, me chama.`], ["Follow-up", `${first} — só passando para saber se conseguiu revisar. Sigo à disposição.`]],
    ES: [["Confirmar", `${first} — ¡confirmado! Sábado 11h, los encuentro en el lobby.`], ["Enviar docs", `${first} — te envío ahora el cronograma y los documentos. Cualquier duda, me escribes.`], ["Follow-up", `${first} — ¿pudiste revisar lo que te envié? Quedo a tu disposición.`]],
    EN: [["Confirm", `${first} — confirmed. I will meet you in the lobby at 11am Saturday.`], ["Send docs", `${first} — sending the schedule and documents now. Any questions, just message me.`], ["Follow up", `${first} — checking in: did you get a chance to review? Happy to walk through it.`]],
  };
  return sets[lang] ?? sets.EN;
}

export function Inbox() {
  const navigate = useNavigate();
  const { items: threads } = useCollection<Thread>("threads");
  const { items: messages } = useCollection<Message>("messages");

  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [chatInput, setChatInput] = useState("");

  const ordered = useMemo(() => [...threads].sort((a, b) => a.id.localeCompare(b.id)), [threads]);
  const filtered = ordered.filter((t) => (channel === "all" || t.channel === channel) && (!search.trim() || (t.contact_id + " " + (t.subject ?? "")).toLowerCase().includes(search.trim().toLowerCase())));

  const active = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? ordered[0];
  const msgsFor = (tid: string) => messages.filter((m) => m.thread_id === tid).sort((a, b) => a.id.localeCompare(b.id));

  const select = (t: Thread) => { setSelectedId(t.id); setReadSet((s) => new Set(s).add(t.id)); };

  const send = () => {
    const txt = chatInput.trim();
    if (!txt || !active) return;
    const msg: Message = { id: newId(`${active.id}_s`), thread_id: active.id, dir: "out", body: txt, at: "Now" };
    void save<Message>("messages", msg, { actor: "user", action: `Sent message — ${prettyName(active.contact_id)} · ${CH_LABEL[active.channel] ?? active.channel}` });
    setChatInput("");
  };

  if (!active) return <div style={{ padding: "40px 48px", fontFamily: SANS, color: "#8F8F8F" }}>No conversations yet.</div>;

  const activeMsgs = msgsFor(active.id);
  const lang = QR_LANG[active.contact_id] ?? "EN";
  const first = prettyName(active.contact_id).split(" ")[0];
  const qrs = quickReplies(lang, first);

  return (
    <div style={{ padding: "22px 48px 44px" }}>
      <GmailLiveStrip />
      <div className="ib-shell">
        {/* LEFT · threads */}
        <div className="ib-left">
          <div style={{ padding: "12px 12px 8px" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="ib-search" style={{ width: "100%", background: "rgba(255,255,255,0.55)", border: "none", borderRadius: 999, padding: "9px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: "4px 12px 12px", borderBottom: "1px solid #ECECEC" }}>
            {CH_FILTERS.map(([label, id]) => {
              const on = channel === id;
              return <div key={id} onClick={() => setChannel(id)} style={{ fontFamily: SANS, fontWeight: on ? 500 : 400, fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: on ? "#0D0D0D" : "#5D5D5D", background: on ? "rgba(255,255,255,0.62)" : "transparent", border: `1px solid ${on ? "#D9D9D9" : "transparent"}`, borderRadius: 999, padding: "5px 12px", cursor: "pointer", transition: "all 150ms" }}>{label}</div>;
            })}
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {filtered.map((t) => {
              const sel = t.id === active.id;
              const msgs = msgsFor(t.id);
              const last = msgs[msgs.length - 1];
              const snippet = (last?.dir === "out" ? "You: " : "") + (last?.body ?? "");
              const unread = readSet.has(t.id) ? 0 : (t.unread_count ?? 0);
              return (
                <div key={t.id} onClick={() => select(t)} className="ib-threadrow" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", margin: "2px 8px", borderRadius: 12, cursor: "pointer", transition: "background 150ms", background: sel ? "rgba(255,255,255,0.6)" : "transparent" }}>
                  <div style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: "rgba(255,255,255,0.62)", border: `1px solid ${sel ? "#C7C7C7" : "#E3E3E3"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 11, color: sel ? "#0D0D0D" : "#8F8F8F" }}>{t.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prettyName(t.contact_id)}</span>
                      <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>{t.last_time}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                      <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", border: "1px solid #D9D9D9", borderRadius: 4, padding: "1px 5px" }}>{CH_LABEL[t.channel] ?? t.channel}</span>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 400, fontSize: 13, color: unread > 0 ? "#303030" : "#5D5D5D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{snippet}</span>
                      {unread > 0 && <span style={{ flex: "none", minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "#E9E8E4", color: "#0D0D0D", fontFamily: SANS, fontWeight: 400, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 24px", textAlign: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E3E3E3" }} />
                <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#303030" }}>No conversations match</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", lineHeight: 1.5 }}>Try another channel or clear the search.</span>
                <span onClick={() => { setSearch(""); setChannel("all"); }} className="ib-clear" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", border: "1px solid #D9D9D9", borderRadius: 999, padding: "6px 14px", cursor: "pointer", transition: "background 150ms" }}>Clear filters</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT · conversation */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 24px", borderBottom: "1px solid #ECECEC" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 16, color: "#0D0D0D" }}>{prettyName(active.contact_id)}</div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", marginTop: 2 }}>{active.subject} · {CH_LABEL[active.channel] ?? active.channel}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => navigate("/opportunities")} className="ib-hdrbtn" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "all 150ms" }}>Open deal</div>
              <div onClick={() => navigate(`/contacts/${active.contact_id}`)} className="ib-hdrbtn" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 13px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "all 150ms" }}>Contact</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "26px 28px", background: "rgba(255,255,255,0.62)", display: "flex", flexDirection: "column", gap: 16 }}>
            {activeMsgs.map((m) => {
              const out = m.dir === "out";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                  <div className={out ? "ib-bubble-out" : "ib-bubble-in"} style={{ maxWidth: "74%", padding: "12px 16px", borderRadius: out ? "20px 20px 6px 20px" : "20px 20px 20px 6px" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.55, color: out ? "#FFFFFF" : "#303030" }}>{m.body}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 10, letterSpacing: "0.06em", color: out ? "rgba(255,255,255,0.6)" : "#8F8F8F", marginTop: 6, textAlign: "right" }}>{m.at}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ flex: "none", display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", padding: "0 22px 8px" }}>
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F", border: "1px solid #E3E3E3", borderRadius: 999, padding: "4px 9px" }}>Auto · {lang}</span>
            {qrs.map(([label, txt]) => <span key={label} onClick={() => setChatInput(txt)} className="ib-qr" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#303030", background: "rgba(255,255,255,0.55)", border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 12px", cursor: "pointer", transition: "all 150ms", whiteSpace: "nowrap" }}>{label}</span>)}
          </div>
          <div style={{ flex: "none", padding: "10px 22px 18px" }}>
            <div className="ib-composer" style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #E3E3E3", borderRadius: 28, background: "rgba(255,255,255,0.62)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "8px 8px 8px 16px" }}>
              <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", border: "1px solid #D9D9D9", borderRadius: 4, padding: "3px 7px" }}>{CH_LABEL[active.channel] ?? active.channel}</span>
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Write a message…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", fontFamily: SANS, fontWeight: 400, fontSize: 14.5, color: "#0D0D0D", outline: "none" }} />
              <button onClick={send} title="Send" className="ib-send" style={{ flex: "none", width: 36, height: 36, borderRadius: "50%", background: "#0D0D0D", border: "none", color: "#FFFFFF", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "opacity 150ms" }}>↑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Thread contact_id → display name (seed threads mirror contact ids). */
function prettyName(id: string): string {
  const map: Record<string, string> = { marcelo: "Marcelo Carvalho", nakamura: "Kenji Nakamura", sterling: "Robert Sterling", ravel: "Elena Ravel", keller: "Anton Keller", alvarez: "Carlos Alvarez", bittencourt: "Ana Bittencourt" };
  return map[id] ?? id;
}
