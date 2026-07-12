import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCollection } from "../../data/hooks";
import { getById, recordAction, save } from "../../data/repository";
import type { Contact, Mandate, Opportunity } from "../../domain/types";
import { SANS, CONTACT_TOUCHES } from "../contacts/data";
import {
  AMENITIES, BRIEF, buildProfile, type BuyerProfile, CANON_STATUS, CHAT_CHIPS,
  DEFAULT_PLAN, enrichRows, ESSENCE, GENERIC_BRIEF, hasProfile, JOURNEY_IDX,
  JOURNEY_SEQ, LEARNED, MLS_LANG, MLS_MATCHES, PINNED, PLAN_AHEAD, type PlanItem,
  PROFILE_OPTS, RELATED, SINCE_LINE, toCanonStatus,
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
  const [briefOpen, setBriefOpen] = useState(false);
  const [enrich, setEnrich] = useState<"idle" | "scanning" | "review" | "applied">("idle");
  const [scOpen, setScOpen] = useState(false);
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [mlsRun, setMlsRun] = useState(false);
  const [mlsSel, setMlsSel] = useState<Record<string, boolean>>({});
  const [mlsAck, setMlsAck] = useState("");
  const [planOpen, setPlanOpen] = useState(true);
  const [memOpen, setMemOpen] = useState(true);
  const [tlShift, setTlShift] = useState<Record<number, string>>({});
  const [tlHov, setTlHov] = useState<number | null>(null);
  const [learnDone, setLearnDone] = useState(false);

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
  const saved = (ct.preferences?.buyer as Partial<BuyerProfile> | undefined) ?? undefined;
  const prof = profile ?? buildProfile(id, saved);
  const showProfile = hasProfile(id) || !!saved;
  const mlsLang = MLS_LANG[id] ?? (ct.language?.[0] ?? "EN");
  const mlsSelCount = MLS_MATCHES.filter((m) => mlsSel[m.id]).length;

  const persistProfile = (next: BuyerProfile, field: string) => {
    setProfile(next);
    void getById<Contact>("contacts", id).then((cur) => {
      if (!cur) return;
      void save<Contact>("contacts", { ...cur, preferences: { ...(cur.preferences ?? {}), buyer: next } }, { actor: "user", skill: "senior_advisor", action: `Updated buyer profile — ${field} · ${ct.name} · auto-saved` });
    });
  };
  const setField = (k: keyof BuyerProfile, label: string) => (v: string) => persistProfile({ ...prof, [k]: v }, label);
  const toggleAmenity = (a: string) => {
    const on = prof.amenities.includes(a);
    persistProfile({ ...prof, amenities: on ? prof.amenities.filter((x) => x !== a) : [...prof.amenities, a] }, `Amenity ${on ? "removed" : "added"} · ${a}`);
  };
  const runMls = () => { setMlsRun(true); setScOpen(false); void save<Contact>("contacts", ct, { actor: "agent", skill: "senior_advisor", action: `MLS Match — sweep re-run against updated criteria · ${ct.name} · results refreshed` }); };
  const suggestMls = () => {
    if (!mlsSelCount) { setMlsAck("Select one or more listings first."); return; }
    setMlsAck(`Curated draft prepared (${mlsSelCount} listing${mlsSelCount > 1 ? "s" : ""}) — message in your voice + private preview page. Queued in Needs Your Decision; on approval it sends via WhatsApp, logs the touch and resets the cadence clock.`);
    void save<Contact>("contacts", ct, { actor: "agent", skill: "senior_advisor", action: `MLS Match — curated suggestion drafted for ${ct.name} · ${mlsSelCount} listing(s) · drafted in ${mlsLang} (profile language), queued for approval` });
  };
  const draftTour = () => {
    if (!mlsSelCount) { setMlsAck("Select one or more listings first."); return; }
    setMlsAck(`Tour drafted · ${mlsSelCount} stop${mlsSelCount > 1 ? "s" : ""} — access requests queued in Needs Your Decision.`);
    void save<Contact>("contacts", ct, { actor: "agent", skill: "transaction_coordinator", action: `MLS Match — tour drafted for ${ct.name} · ${mlsSelCount} stop(s), access requests queued` });
  };

  const hasRef = !!ct.referral_of;
  const refBy = contacts.find((c) => c.id === ct.referral_of)?.name ?? "";
  const brief = BRIEF[id] ?? GENERIC_BRIEF;
  const enrichData = enrichRows(ct.name);
  const briefSections: Array<[string, string[]]> = [
    ["Who", [`${ct.relationship} · ${ct.location} · since ${ct.since}`, (ct.tags ?? []).join(" · ")]],
    ["Last touches", touches.slice(0, 2).map((t) => `${t.date} · ${t.type} — ${t.body}`)],
    ["Open objections", brief.objections],
    ["Family & context", brief.family],
    ["Comps in play", brief.comps],
  ];
  const startEnrich = () => { setEnrich("scanning"); window.setTimeout(() => setEnrich("review"), 900); };
  const applyEnrich = () => { setEnrich("applied"); void save<Contact>("contacts", { ...ct, company: enrichData[0].value, title: enrichData[1].value, linkedin: enrichData[3].value }, { actor: "agent", skill: "chief_of_staff", action: `Enriched profile — ${ct.name} · ${enrichData.length} fields from LinkedIn + public sources (sources logged)` }); };

  /* Relationship timeline — Future (plan ahead) + Past (memory log). */
  const plan: PlanItem[] = PLAN_AHEAD[id] ?? DEFAULT_PLAN;
  const shiftDate = (label: string, days: number) => { const mm = /([A-Za-z]{3}) (\d+)/.exec(label); return mm ? `${mm[1]} ${parseInt(mm[2], 10) + days}` : label; };
  const nudgePlan = (i: number, days: number) => {
    const base = tlShift[i] ?? plan[i].d;
    const next = shiftDate(base, days);
    if (next === base) return;
    setTlShift((s) => ({ ...s, [i]: next }));
    void recordAction({ actor: "user", skill: "chief_of_staff", action: `Plan adjusted · ${ct.name} — "${plan[i].what}" → ${next} · agent re-plans around it` }, `contact/${id}/plan/${i}`, () => setTlShift((s) => { const n = { ...s }; delete n[i]; return n; }));
  };
  const learned = LEARNED[id];
  const saveLearned = () => {
    if (!learned) return;
    setLearnDone(true);
    void save<Contact>("contacts", { ...ct, ...(learned.fields.birthday ? { birthday: learned.fields.birthday } : {}), ...(learned.fields.spouse ? { spouse: learned.fields.spouse } : {}) }, { actor: "agent", skill: "chief_of_staff", action: `Profile enriched from conversation · ${ct.name} — birthday + spouse saved, source logged` });
  };

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

  /* Buyer Requirement Profile field renderers (literal styles from fragment 08). */
  const pfLabel = { fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "#8F8F8F" };
  const pfInput = { border: "none", borderBottom: "1px solid #D9D9D9", background: "transparent", padding: "8px 0", fontFamily: SANS, fontWeight: 400, fontSize: 15, color: "#303030", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const pfSectionHead = { fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#0D0D0D", paddingBottom: 12, borderBottom: "1px solid #E3E3E3", marginBottom: 26 };
  const pfInputField = (label: string, key: keyof BuyerProfile, ph: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <label style={pfLabel}>{label}</label>
      <input key={`${id}-${key}-${String(prof[key])}`} defaultValue={prof[key] as string} placeholder={ph} onBlur={(e) => { if (e.target.value !== prof[key]) setField(key, label)(e.target.value); }} className="cd-pf" style={pfInput} />
    </div>
  );
  const pfSelectField = (label: string, key: keyof BuyerProfile, opts: readonly string[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <label style={pfLabel}>{label}</label>
      <select value={prof[key] as string} onChange={(e) => setField(key, label)(e.target.value)} className="cd-pf" style={pfInput}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  const pfAreaField = (label: string, key: keyof BuyerProfile, ph: string, full?: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, gridColumn: full ? "1 / -1" : undefined }}>
      <label style={pfLabel}>{label}</label>
      <textarea key={`${id}-${key}-${String(prof[key])}`} rows={3} defaultValue={prof[key] as string} placeholder={ph} onBlur={(e) => { if (e.target.value !== prof[key]) setField(key, label)(e.target.value); }} className="cd-pf" style={{ border: "1px solid #D9D9D9", background: "transparent", padding: "12px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 14.5, lineHeight: 1.6, color: "#303030", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
    </div>
  );

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
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: 12 }}>
            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: "#5D5D5D", flex: 1 }}>{SINCE_LINE[id] ?? "Since your last visit: no new activity — cadence clock running."}</div>
            <button onClick={() => setBriefOpen(true)} className="cd-chip" style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D0D0D", background: "rgba(255,255,255,0.55)", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 14px", cursor: "pointer", transition: "all 150ms", whiteSpace: "nowrap" }}>Pre-meeting brief</button>
          </div>
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

          {showProfile && (
            <div style={{ marginTop: 30, border: "1px solid #E3E3E3", borderRadius: 12, background: "rgba(255,255,255,0.5)", overflow: "hidden" }}>
              {/* Collapsible header */}
              <div onClick={() => setScOpen((o) => !o)} className="cd-schead" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 20px", cursor: "pointer", transition: "background 150ms" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}>Search criteria</span>
                  <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>the profile that drives this sweep — expand to edit &amp; re-run</span>
                </div>
                <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 13, color: "#8F8F8F" }}>{scOpen ? "⌃" : "⌄"}</span>
              </div>

              {/* Collapsed summary — the compact criteria at a glance */}
              {!scOpen && (
                <div style={{ borderTop: "1px solid #E3E3E3", padding: "4px 20px 8px" }}>
                  {([["Asset", prof.assetType || "—"], ["Areas", prof.areas || "—"], ["Budget", prof.budgetMax || "—"], ["Beds / Baths", `${prof.bedsMin || "—"} / ${prof.bathsMin || "—"}`], ["SqFt", prof.sqftMin || "—"], ["Must-haves", prof.nonNegotiables || "—"]] as Array<[string, string]>).map(([l, v]) => (
                    <div key={l} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid #ECECEC" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: "#8F8F8F" }}>{l}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#303030", textAlign: "right" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded — full Buyer Requirement Profile */}
              {scOpen && (
                <div style={{ borderTop: "1px solid #E3E3E3", padding: "0 20px" }}>
                  <div style={{ padding: "24px 0 34px", maxWidth: 880 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: "#0D0D0D" }}>Buyer Requirement Profile</div>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F" }}>Auto-saved</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, marginBottom: 34 }}>
                      <p style={{ margin: 0, fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: "#8F8F8F", maxWidth: 560 }}>Capture everything known about the asset this contact is looking for. The richer the profile, the sharper the MLS match.</p>
                      <div onClick={runMls} className="cd-mlsbtn" style={{ cursor: "pointer", flex: "none", display: "flex", alignItems: "center", gap: 9, background: "#E9E8E4", color: "#0D0D0D", padding: "11px 20px", fontFamily: SANS, fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8F8F8F" }} />MLS Match</div>
                    </div>

                    <div style={pfSectionHead}>01 · Asset Profile</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "26px 40px", marginBottom: 44 }}>
                      {pfInputField("Asset Type", "assetType", "e.g. Penthouse")}
                      {pfSelectField("Architectural Style", "style", PROFILE_OPTS.style)}
                      {pfSelectField("Condition", "condition", PROFILE_OPTS.condition)}
                      {pfSelectField("Purpose", "purpose", PROFILE_OPTS.purpose)}
                      {pfSelectField("Ownership", "ownership", PROFILE_OPTS.ownership)}
                      {pfSelectField("Occupancy Timeline", "timeline", PROFILE_OPTS.timeline)}
                    </div>

                    <div style={pfSectionHead}>02 · Location</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "26px 40px", marginBottom: 44 }}>
                      {pfInputField("Target Areas / Neighborhoods", "areas", "e.g. Brickell, Coconut Grove")}
                      {pfInputField("Proximity Priorities", "proximity", "Schools, waterfront, business district…")}
                    </div>

                    <div style={pfSectionHead}>03 · Budget &amp; Financing</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "26px 40px", marginBottom: 44 }}>
                      {pfInputField("Budget — Min", "budgetMin", "$")}
                      {pfInputField("Budget — Max", "budgetMax", "$")}
                      {pfSelectField("Financing", "financing", PROFILE_OPTS.financing)}
                    </div>

                    <div style={pfSectionHead}>04 · Space Requirements</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "26px 40px", marginBottom: 44 }}>
                      {pfInputField("Bedrooms (min)", "bedsMin", "e.g. 3+")}
                      {pfInputField("Bathrooms (min)", "bathsMin", "e.g. 2.5+")}
                      {pfInputField("Interior SqFt (min)", "sqftMin", "e.g. 2,500")}
                      {pfInputField("Lot Size", "lotSize", "acres / m²")}
                      {pfInputField("Parking", "parking", "spaces")}
                      {pfSelectField("Outdoor Space", "outdoor", PROFILE_OPTS.outdoor)}
                    </div>

                    <div style={{ ...pfSectionHead, marginBottom: 22 }}>05 · Amenities &amp; Features</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 44 }}>
                      {AMENITIES.map((a) => {
                        const on = prof.amenities.includes(a);
                        return <div key={a} onClick={() => toggleAmenity(a)} style={{ cursor: "pointer", userSelect: "none", padding: "8px 15px", fontFamily: SANS, fontWeight: 400, fontSize: 13, letterSpacing: "0.04em", border: `0.5px solid ${on ? "#0D0D0D" : "#8F8F8F"}`, background: on ? "#0D0D0D" : "transparent", color: on ? "#FFFFFF" : "#5D5D5D", transition: "all 0.15s" }}>{a}</div>;
                      })}
                    </div>

                    <div style={pfSectionHead}>06 · Must-haves, Dealbreakers &amp; Notes</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "26px 40px" }}>
                      {pfAreaField("Non-negotiables", "nonNegotiables", "Absolute must-haves…")}
                      {pfAreaField("Dealbreakers", "dealbreakers", "Hard no's…")}
                      {pfAreaField("Additional Notes", "notes", "", true)}
                    </div>
                  </div>
                </div>
              )}

              {/* MLS Match results — the sweep against the profile */}
              {mlsRun && (
                <div style={{ borderTop: "1px solid #E3E3E3", padding: "18px 20px 22px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    {MLS_MATCHES.map((m) => {
                      const on = !!mlsSel[m.id];
                      return (
                        <div key={m.id} onClick={() => setMlsSel((s) => ({ ...s, [m.id]: !s[m.id] }))} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 20, padding: 16, border: `0.5px solid ${on ? "#0D0D0D" : "#E3E3E3"}`, background: on ? "#FCFCFC" : "transparent", borderRadius: 12, transition: "border-color 150ms" }}>
                          <div style={{ width: 20, height: 20, flex: "none", border: `1px solid ${on ? "#0D0D0D" : "#8F8F8F"}`, background: on ? "#E9E8E4" : "transparent", color: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, borderRadius: 6 }}>{on ? "✓" : ""}</div>
                          <div style={{ flex: "none", width: 120, height: 80, background: m.plate, borderRadius: 8 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.addr}</span>
                              <span style={{ flex: "none", fontFamily: SANS, fontWeight: 500, fontSize: 13, color: "#0D0D0D" }}>{m.price}</span>
                            </div>
                            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", marginTop: 3 }}>{m.specs}</div>
                            <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, fontStyle: "italic", color: "#8F8F8F", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.tagline}</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
                              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", color: "#10A37F" }}>{m.match} fit</span>
                              {m.isNew && <span style={{ display: "inline-block", background: "#E9E8E4", color: "#0D0D0D", fontFamily: SANS, fontWeight: 400, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", padding: "2px 6px" }}>New</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                    <button onClick={suggestMls} className="cd-chip" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "9px 18px", fontFamily: SANS, fontWeight: 500, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "opacity 150ms" }}>Suggest selected · {mlsSelCount}</button>
                    <button onClick={draftTour} className="cd-chip" style={{ background: "transparent", border: "1px solid #0D0D0D", borderRadius: 999, padding: "9px 16px", fontFamily: SANS, fontWeight: 400, fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "background 150ms" }}>Draft tour · selected</button>
                    <span title="Identified from the contact profile — Nationality & Languages" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 11px", fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10A37F", flex: "none" }} />agent drafts in {mlsLang} — from the profile</span>
                    {mlsAck && <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F", flexBasis: "100%" }}>{mlsAck}</span>}
                  </div>
                </div>
              )}
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

          {/* FUTURE · The plan ahead */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginTop: 46 }}>
            <div onClick={() => setPlanOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <span style={{ width: 10, flex: "none", fontFamily: SANS, fontWeight: 300, fontSize: 12, color: "#8F8F8F" }}>{planOpen ? "⌄" : "›"}</span>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0D0D0D", flex: "none" }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>The plan ahead</span>
            </div>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#B8B8B8" }}>relationship plan — search milestones live on the opportunity · hover to move</span>
          </div>
          {planOpen && (
            <div style={{ borderTop: "1px solid #E3E3E3", marginTop: 14 }}>
              {plan.map((f, i) => (
                <div key={i} onClick={() => { if (f.goDeal && deals[0]) navigate(`/deal/${encodeURIComponent(deals[0].name ?? deals[0].id)}`); }} onMouseEnter={() => setTlHov(i)} onMouseLeave={() => setTlHov(null)} className="cd-planrow" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 4px", borderBottom: "1px solid #ECECEC", cursor: f.goDeal ? "pointer" : "default", transition: "background 150ms" }}>
                  <span style={{ width: 56, flex: "none", fontFamily: SANS, fontWeight: 300, fontSize: 12, letterSpacing: "0.02em", color: "#5D5D5D" }}>{tlShift[i] ?? f.d}</span>
                  <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: f.c }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D" }}>{f.what}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#8F8F8F", marginTop: 2 }}>{f.why}</div>
                  </div>
                  {tlHov === i && !f.goDeal && (
                    <div style={{ display: "flex", gap: 6, flex: "none" }}>
                      <button onClick={(e) => { e.stopPropagation(); nudgePlan(i, 1); }} className="cd-nudge" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "4px 10px", fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "all 150ms" }}>+1d</button>
                      <button onClick={(e) => { e.stopPropagation(); nudgePlan(i, 7); }} className="cd-nudge" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "4px 10px", fontFamily: SANS, fontWeight: 400, fontSize: 9.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer", transition: "all 150ms" }}>+1w</button>
                    </div>
                  )}
                  <span style={{ flex: "none", fontFamily: SANS, fontWeight: 500, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: f.c }}>{f.st}</span>
                </div>
              ))}
            </div>
          )}

          {/* PAST · Memory */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginTop: 46 }}>
            <div onClick={() => setMemOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <span style={{ width: 10, flex: "none", fontFamily: SANS, fontWeight: 300, fontSize: 12, color: "#8F8F8F" }}>{memOpen ? "⌄" : "›"}</span>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8F8F8F", flex: "none" }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>Memory</span>
            </div>
            <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#B8B8B8" }}>everything learned &amp; logged — profile fills itself</span>
          </div>
          {memOpen && (
            <>
              {learned && !learnDone && (
                <div style={{ border: "1px solid #E3E3E3", borderLeft: "2px solid #10A37F", background: "rgba(255,255,255,0.62)", padding: "14px 18px", marginTop: 14 }}>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10A37F" }}>Agent learned</span>
                  <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.55, color: "#303030", marginTop: 6 }}>{learned.text}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={saveLearned} className="cd-chip" style={{ background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 14px", fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0D0D0D", cursor: "pointer", transition: "opacity 150ms" }}>Save to profile</button>
                    <button onClick={() => setLearnDone(true)} className="cd-chip" style={{ background: "transparent", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#5D5D5D", cursor: "pointer" }}>Dismiss</button>
                  </div>
                </div>
              )}
              {touches.length > 0 && (
                <div style={{ borderTop: "1px solid #E3E3E3", marginTop: 14 }}>
                  {touches.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "12px 4px", borderBottom: "1px solid #ECECEC" }}>
                      <span style={{ width: 56, flex: "none", fontFamily: SANS, fontWeight: 300, fontSize: 11.5, color: "#8F8F8F" }}>{a.date}</span>
                      <span style={{ width: 76, flex: "none", fontFamily: SANS, fontWeight: 600, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8F8F8F" }}>{a.type}</span>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.55, color: "#303030" }}>{a.body}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#B8B8B8", marginTop: 14 }}>End of file — the agent keeps everything; ask the dock for anything older.</div>
            </>
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

          {/* ENRICH · the CRM fills itself */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "34px 0 4px", paddingBottom: 11, borderBottom: "1px solid #E3E3E3" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10A37F", flex: "none" }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0D0D0D" }}>Enrich from public sources</span>
            </div>
            {enrich === "idle" && <button onClick={startEnrich} className="cd-chip" style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D0D0D", background: "rgba(255,255,255,0.55)", border: "1px solid #E3E3E3", borderRadius: 999, padding: "7px 14px", cursor: "pointer", transition: "all 150ms" }}>Enrich profile</button>}
            {enrich === "scanning" && <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, fontStyle: "italic", color: "#8F8F8F" }}>Scanning LinkedIn + public sources…</span>}
            {enrich === "review" && <button onClick={applyEnrich} className="cd-chip" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "#0D0D0D", background: "#E9E8E4", border: "1px solid #E0DFDA", borderRadius: 999, padding: "7px 14px", cursor: "pointer", transition: "all 150ms" }}>Apply all · {enrichData.length}</button>}
            {enrich === "applied" && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10A37F" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10A37F" }} />Filed · sources logged</span>}
          </div>
          {enrich === "idle" && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", padding: "12px 4px" }}>The agent scans LinkedIn and public sources to complete this profile — you arbitrate before anything is saved.</div>}
          {(enrich === "review" || enrich === "applied") && enrichData.map((f) => (
            <div key={f.field} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 4px", borderBottom: "1px solid #ECECEC" }}>
              <span style={{ flex: "none", width: 110, fontFamily: SANS, fontWeight: 400, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8F8F8F" }}>{f.field}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#0D0D0D" }}>{f.value}</div><div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 11, color: "#10A37F", marginTop: 2 }}>{f.source}</div></div>
              {enrich === "applied" && <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>saved ✓</span>}
            </div>
          ))}
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

      {/* PRE-MEETING BRIEF · overlay */}
      {briefOpen && (
        <>
          <div onClick={() => setBriefOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.32)" }} />
          <div className="cd-brief">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "28px 32px 20px", borderBottom: "1px solid #E3E3E3" }}>
              <div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: "#0D0D0D" }}>Pre-Meeting Brief</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", marginTop: 6 }}>{ct.name} · generated by agent · 30 min before</div>
              </div>
              <span onClick={() => setBriefOpen(false)} style={{ fontFamily: SANS, fontWeight: 200, fontSize: 20, color: "#8F8F8F", cursor: "pointer", lineHeight: 1 }}>×</span>
            </div>
            <div style={{ padding: "8px 32px 48px" }}>
              {briefSections.map(([label, items]) => (
                <div key={label} style={{ padding: "22px 0", borderBottom: "1px solid #E3E3E3" }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", marginBottom: 12 }}>{label}</div>
                  {(items.length ? items : ["—"]).map((it, i) => <div key={i} style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, lineHeight: 1.65, color: "#303030", padding: "3px 0" }}>{it}</div>)}
                </div>
              ))}
              <div className="cd-onething" style={{ marginTop: 24, borderRadius: 12, borderLeft: "2px solid #0D0D0D", padding: "22px 24px" }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F" }}>Objective of this conversation</div>
                <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14.5, lineHeight: 1.65, color: "#303030", marginTop: 12 }}>{brief.objective}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
