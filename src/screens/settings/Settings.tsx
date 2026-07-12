import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCollection } from "../../data/hooks";
import { getAuditLog, onDataChange, save } from "../../data/repository";
import type { AuditEntry, Contact, Settings as SettingsRec } from "../../domain/types";
import { SANS } from "../contacts/data";
import "./Settings.css";

/* ================= SCREEN · SETTINGS (fragment 16) =================
   Nav rail + sections. §03 Agent Autonomy and §02 Cadence are editable and
   persist to the settings store — the same store the AgentService and
   Intelligence read at runtime. */

const NAV: Array<[string, string]> = [
  ["01", "Profile"], ["16", "Team & Access"], ["03", "Agent Autonomy"], ["02", "Cadence Rules"],
  ["18", "Contact Types"], ["04", "Economics"], ["17", "Referral Partners"], ["05", "Integrations"],
  ["11", "Pipeline & Stages"], ["12", "MLS & Matching"], ["08", "Voice & Templates"], ["07", "Scoring & Forecast"],
  ["13", "Display & Locale"], ["09", "Data & Privacy"],
];

const AUTONOMY_ORDER = ["capture", "hygiene", "drafts", "send", "status", "chase"];
const CADENCE_ORDER = ["hot", "warm", "active", "past", "network"];
const CADENCE_DOT: Record<string, string> = { hot: "#0D0D0D", warm: "#5D5D5D", active: "#0D0D0D", past: "#8F8F8F", network: "#8F8F8F" };

const ECON = [
  { label: "Standard commission", value: "5.0%" }, { label: "Co-broke default split", value: "50 / 50" },
  { label: "Referral fee out", value: "25%" }, { label: "Probability bands", value: "HOT 60 · WARM 30 · NEW 10" },
];
const CONNECTORS = [
  { name: "Google Workspace", kind: "One OAuth · wictor@arraes.com", on: true },
  { name: "WhatsApp Business", kind: "Cloud API · +1 305 ··· · Meta verified", on: true },
  { name: "MLS", kind: "Matrix + broker feeds · nightly sync", on: true },
  { name: "DocuSign", kind: "Not connected — contracts stay manual", on: false },
];

function SecHead({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
        <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 13, letterSpacing: "0.12em", color: "#8F8F8F" }}>{num}</span>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: "#0D0D0D" }}>{title}</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", marginBottom: 18 }}>{desc}</div>
    </>
  );
}
const Rows = ({ children }: { children: ReactNode }) => <div style={{ borderTop: "1px solid #E3E3E3" }}>{children}</div>;

export function Settings() {
  const { items: settingsRows } = useCollection<SettingsRec>("settings");
  const { items: contacts } = useCollection<Contact>("contacts");
  const [sec, setSec] = useState("03");
  const [econ, setEcon] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  useEffect(() => {
    const load = () => void getAuditLog().then(setAudit);
    load();
    return onDataChange(load);
  }, []);
  const settings = settingsRows[0];

  const autonomy = (settings?.autonomy_rules ?? {}) as Record<string, { label: string; desc: string; autonomous: boolean }>;
  const cadences = (settings?.cadences ?? {}) as Record<string, { label: string; desc: string; days: number }>;
  const profile = (settings?.profile ?? {}) as Record<string, string>;
  const contactTypes = (settings?.contact_types ?? []) as string[];
  const partners = useMemo(() => contacts.filter((c) => c.category === "partner"), [contacts]);

  const persist = (next: SettingsRec, action: string) => void save<SettingsRec>("settings", next, { actor: "user", skill: "compliance", action });

  const toggleAutonomy = (key: string) => {
    if (!settings) return;
    const cur = autonomy[key];
    const next = { ...settings, autonomy_rules: { ...autonomy, [key]: { ...cur, autonomous: !cur.autonomous } } };
    persist(next, `Autonomy · ${cur.label} → ${cur.autonomous ? "Ask first" : "Autonomous"}`);
  };
  const setCadenceDays = (key: string, days: number) => {
    if (!settings) return;
    const next = { ...settings, cadences: { ...cadences, [key]: { ...cadences[key], days } } };
    persist(next, `Cadence · ${cadences[key].label} → every ${days} days`);
  };

  const navNumFor = (key: string) => String(NAV.findIndex(([k]) => k === key) + 1).padStart(2, "0");

  return (
    <div style={{ display: "flex", gap: 52, padding: "8px 48px 80px", alignItems: "flex-start" }}>
      <div style={{ width: 200, flex: "none", position: "sticky", top: 24, paddingTop: 26 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11.5, letterSpacing: "0.05em", textTransform: "uppercase", color: "#8F8F8F", paddingBottom: 12, borderBottom: "1px solid #E3E3E3" }}>Sections</div>
        {NAV.map(([key, label], i) => {
          const on = sec === key;
          return (
            <div key={key} onClick={() => setSec(key)} onMouseEnter={() => setSec(key)} className="st-navrow" style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "9px 10px", margin: "0 -10px", cursor: "pointer", userSelect: "none", transition: "background 150ms", background: on ? "rgba(255,255,255,0.62)" : "transparent" }}>
              <span style={{ fontFamily: SANS, fontSize: 11, letterSpacing: "0.1em", width: 20, flex: "none", fontWeight: on ? 500 : 200, color: on ? "#0D0D0D" : "#8F8F8F" }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "#0D0D0D" : "#303030" }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, minWidth: 0, maxWidth: 1080 }}>
        <section style={{ marginTop: 26 }}>
          {/* 03 AGENT AUTONOMY */}
          {sec === "03" && (
            <>
              <SecHead num={navNumFor("03")} title="Agent Autonomy" desc="What the agent may do without asking. Everything else lands in Needs Your Decision." />
              <Rows>
                {AUTONOMY_ORDER.filter((k) => autonomy[k]).map((k) => {
                  const a = autonomy[k]; const on = a.autonomous;
                  return (
                    <div key={k} onClick={() => toggleAutonomy(k)} className="st-toggle" style={{ display: "flex", alignItems: "center", gap: 24, padding: "15px 4px", borderBottom: "1px solid #E3E3E3", cursor: "pointer", transition: "background 150ms" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#0D0D0D" }}>{a.label}</div>
                        <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#5D5D5D", marginTop: 3 }}>{a.desc}</div>
                      </div>
                      <div style={{ width: 30, height: 14, flex: "none", borderRadius: 999, border: `0.5px solid ${on ? "#10A37F" : "#B4B4B4"}`, background: on ? "#10A37F" : "transparent", display: "flex", alignItems: "center", justifyContent: on ? "flex-end" : "flex-start", padding: 1, transition: "all 150ms" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: on ? "#FFFFFF" : "#8F8F8F", transition: "all 150ms" }} />
                      </div>
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: on ? "#0D0D0D" : "#8F8F8F", width: 88, textAlign: "right", flex: "none" }}>{on ? "Autonomous" : "Ask first"}</span>
                    </div>
                  );
                })}
              </Rows>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, lineHeight: 1.6, color: "#B8B8B8", marginTop: 14 }}>Read at runtime by every skill — the Intelligence decision queue and each draft in Touch Today reflect these toggles instantly. Every change is logged (§ Agent Ledger).</div>
            </>
          )}

          {/* 02 CADENCE */}
          {sec === "02" && (
            <>
              <SecHead num={navNumFor("02")} title="Cadence Rules" desc="The clocks that drive Touch Today. An inbound touch resets the clock." />
              <Rows>
                {CADENCE_ORDER.filter((k) => cadences[k]).map((k) => {
                  const c = cadences[k];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 24, padding: "15px 4px", borderBottom: "1px solid #E3E3E3" }}>
                      <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: CADENCE_DOT[k] ?? "#8F8F8F" }} />
                      <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0D0D0D", width: 90, flex: "none" }}>{c.label}</span>
                      <span style={{ flex: 1, fontFamily: SANS, fontWeight: 400, fontSize: 13.5, color: "#5D5D5D" }}>{c.desc}</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: "none" }}>
                        <span style={{ fontFamily: SANS, fontSize: 12, color: "#8F8F8F" }}>every</span>
                        <input type="number" min={1} value={c.days} onChange={(e) => setCadenceDays(k, parseInt(e.target.value, 10) || 1)} style={{ width: 44, background: "transparent", border: "none", borderBottom: "1px solid #D9D9D9", fontFamily: SANS, fontWeight: 200, fontSize: 18, color: "#0D0D0D", padding: "0 0 2px", outline: "none", textAlign: "center" }} />
                        <span style={{ fontFamily: SANS, fontSize: 12, color: "#8F8F8F" }}>days</span>
                      </div>
                    </div>
                  );
                })}
              </Rows>
            </>
          )}

          {/* 01 PROFILE */}
          {sec === "01" && (
            <>
              <SecHead num={navNumFor("01")} title="Profile" desc="The identity the system writes with — drafts, documents, signatures." />
              <div style={{ borderTop: "1px solid #E3E3E3", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 60px" }}>
                {[["Name", profile.name], ["Role", profile.role], ["Brokerage", profile.brokerage], ["License", profile.license], ["Phone · WhatsApp", profile.phone], ["Email", profile.email], ["Draft languages", profile.draft_languages], ["Signature", profile.signature]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, padding: "14px 4px", borderBottom: "1px solid #E3E3E3", minWidth: 0 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", flex: "none" }}>{l}</span>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 18 CONTACT TYPES */}
          {sec === "18" && (
            <>
              <SecHead num={navNumFor("18")} title="Contact Types" desc="Who the person is to the business — the agent uses types for matching, language and playbooks." />
              <div style={{ borderTop: "1px solid #E3E3E3", paddingTop: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {["Buyer", "Seller", "Tenant", "Landlord", "Investor", "Developer", ...contactTypes].map((t) => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", border: "1px solid #E3E3E3", borderRadius: 999, background: "rgba(255,255,255,0.5)", padding: "6px 14px", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D" }}>{t}</span>
                ))}
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#B8B8B8", marginTop: 14 }}>base types are fixed · custom types become available on every contact · every change is logged</div>
            </>
          )}

          {/* 04 ECONOMICS */}
          {sec === "04" && (
            <>
              <SecHead num={navNumFor("04")} title="Economics" desc="Defaults used in every GCI projection. Overridable per deal." />
              <div style={{ borderTop: "1px solid #E3E3E3", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 60px" }}>
                {ECON.map((f) => (
                  <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "12px 4px", borderBottom: "1px solid #E3E3E3" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F8F8F", flex: "none" }}>{f.label}</span>
                    <input value={econ[f.label] ?? f.value} onChange={(e) => setEcon((s) => ({ ...s, [f.label]: e.target.value }))} style={{ minWidth: 0, flex: 1, maxWidth: "56%", background: "transparent", border: "none", borderBottom: "1px solid #E3E3E3", padding: "4px 0", fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#303030", outline: "none", textAlign: "right" }} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 16 TEAM & ACCESS */}
          {sec === "16" && (
            <>
              <SecHead num={navNumFor("16")} title="Team & Access" desc="Who sits at the seat, and what each role can see. The Principal seat sees everything." />
              <Rows>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 24, padding: "16px 4px", borderBottom: "1px solid #E3E3E3" }}>
                  <div style={{ width: 130, flex: "none" }}>
                    <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>Wictor Arraes</div>
                    <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8F8F8F", marginTop: 3 }}>Principal</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5D5D5D", marginBottom: 8 }}>Sees</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["Everything — full system", "Agent approvals & autonomy", "All financials & forecasts", "Off-market inventory", "KYC & sensitive fields"].map((s) => <span key={s} style={{ border: "1px solid #E3E3E3", borderRadius: 999, padding: "5px 12px", fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#5D5D5D", background: "rgba(255,255,255,0.5)" }}>{s}</span>)}
                    </div>
                  </div>
                </div>
              </Rows>
              <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11.5, color: "#B8B8B8", marginTop: 14 }}>Use "View as" in the sidebar to preview the workspace scoped to Sales Agent, Admin, Transaction Coordinator, Marketing or Referral Partner.</div>
            </>
          )}

          {/* 17 REFERRAL PARTNERS */}
          {sec === "17" && (
            <>
              <SecHead num={navNumFor("17")} title="Referral Partners" desc="Registered partners with a signed agreement — the only sources you can assign a referral origin to." />
              <Rows>
                {partners.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "14px 4px", borderBottom: "1px solid #E3E3E3" }}>
                    <div>
                      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>{p.name}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", marginTop: 2 }}>{p.relationship} · {p.location}</div>
                    </div>
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#10A37F", border: "1px solid #E3E3E3", borderRadius: 999, padding: "4px 10px" }}>Agreement on file · 25% · §6</span>
                  </div>
                ))}
                {partners.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", padding: "14px 4px" }}>No registered partners yet.</div>}
              </Rows>
            </>
          )}

          {/* 05 INTEGRATIONS */}
          {sec === "05" && (
            <>
              <SecHead num={navNumFor("05")} title="Integrations" desc="Connectors the agent works through. Mocked in Phase 1 behind adapters." />
              <Rows>
                {CONNECTORS.map((c) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "15px 4px", borderBottom: "1px solid #E3E3E3" }}>
                    <div>
                      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 14, color: "#0D0D0D" }}>{c.name}</div>
                      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 12, color: "#8F8F8F", marginTop: 2 }}>{c.kind}</div>
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: c.on ? "#10A37F" : "#8F8F8F" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c.on ? "#10A37F" : "#D9D9D9" }} />{c.on ? "Connected" : "Not connected"}</span>
                  </div>
                ))}
              </Rows>
            </>
          )}

          {/* Representative sections */}
          {sec === "11" && <><SecHead num={navNumFor("11")} title="Pipeline & Stages" desc="The stages each pipeline moves through — Purchases, Listings, Rentals, Investments, Off-Market." /><Rows><RepLines lines={["Purchases — Prospecting · Warm · Hot · Under Contract · Won · Lost", "Listings — Prospecting · Contract · Staging · Marketing · Under Contract · Won · Lost", "Rentals — Prospecting · Showings · Contract · Won · Lost", "Investments — Prospecting · Mandate · Presented · Underwriting · Committed · Won", "Off-Market — Quiet · Preview · Circulating · Placed"]} /></Rows></>}
          {sec === "12" && <><SecHead num={navNumFor("12")} title="MLS & Matching" desc="How the agent sweeps inventory against every active buyer profile." /><Rows><RepLines lines={["Sources — Matrix + broker feeds · nightly sync at 6 AM", "Match on — asset type · areas · budget band · beds/baths · must-haves", "Off-market — quiet mandates matched to the buyer book before they list", "New match → surfaces in the contact's MLS Match tab for your review"]} /></Rows></>}
          {sec === "08" && <><SecHead num={navNumFor("08")} title="Voice & Templates" desc="The Constitution the agent writes under — short, declarative, no superlatives." /><Rows><RepLines lines={["Forbidden — ultra-luxury · world-class · exclusive · iconic · state-of-the-art · best-in-class · premier · bespoke", "No exclamation, no emoji · conviction signalled (high/medium/low)", "Every claim references a record or is marked as inference", "Drafts always in the contact's language (PT · EN · ES)"]} /></Rows></>}
          {sec === "07" && <><SecHead num={navNumFor("07")} title="Scoring & Forecast" desc="How heat and probability are computed, and how the forecast weights them." /><Rows><RepLines lines={["Probability bands — HOT 60 · WARM 30 · NEW 10 (overridable per deal)", "Heat — momentum-weighted: reply speed · opens · dwell · inbound recency", "Forecast — weighted GCI = budget × probability × fee rate, by expected close month", "Aging — deals past their stage's expected duration flagged to Risk Radar"]} /></Rows></>}
          {sec === "13" && <><SecHead num={navNumFor("13")} title="Display & Locale" desc="How numbers, dates and currency render across the workspace." /><Rows><RepLines lines={["Currency — USD · $ · thousands grouped", "Dates — Mon DD, YYYY", "Interface language — English", "Contact-facing sends — auto-localized to the contact's language"]} /></Rows></>}
          {sec === "09" && (
            <>
              <SecHead num={navNumFor("09")} title="Data & Privacy" desc="Retention, the private vault, and export rights." />
              <Rows><RepLines lines={["Agent Ledger — insert-only · 7-year retention · action rollback for 30 days", "Private vault — commission economics & sensitive notes · Principal-only · no agent output may use it", "LGPD / CCPA — per-contact data export on request", "Nothing reaches a client without human approval (Law 1)"]} /></Rows>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 8px" }}>
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0D0D0D" }}>Agent Ledger · live audit trail</span>
                <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>{audit.length} entries · insert-only · actor · action · timestamp</span>
              </div>
              <div style={{ borderTop: "1px solid #E3E3E3" }}>
                {audit.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", padding: "12px 4px" }}>No entries yet — every approval, edit, send, status change and file drop lands here.</div>}
                {audit.slice(0, 40).map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "11px 4px", borderBottom: "1px solid #ECECEC" }}>
                    <span style={{ flex: "none", width: 52, fontFamily: SANS, fontWeight: 500, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: e.actor === "agent" ? "#10A37F" : "#8F8F8F" }}>{e.actor}</span>
                    <span style={{ flex: "none", width: 96, fontFamily: SANS, fontWeight: 400, fontSize: 10.5, color: "#8F8F8F" }}>{e.skill ? e.skill.replace(/_/g, " ") : ""}</span>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: "#303030" }}>{e.action}</span>
                    <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#B8B8B8" }}>{e.created_at.slice(11, 16)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function RepLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l) => (
        <div key={l} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "13px 4px", borderBottom: "1px solid #E3E3E3" }}>
          <span style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: "#0D0D0D", position: "relative", top: 5 }} />
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13.5, lineHeight: 1.55, color: "#303030" }}>{l}</span>
        </div>
      ))}
    </>
  );
}
