import { useEffect, useMemo, useState } from "react";
import type { AuditEntry } from "../../domain/types";
import { getAuditLog, getById, onDataChange, save } from "../../data/repository";
import "./Settings.css";

interface SettingRow { id: string; [k: string]: unknown }

const SECTIONS = [
  { num: "01", key: "profile", label: "Profile" },
  { num: "02", key: "types", label: "Contact Types" },
  { num: "03", key: "autonomy", label: "Agent Autonomy" },
  { num: "04", key: "cadences", label: "Cadence Rules" },
  { num: "05", key: "economics", label: "Economics" },
  { num: "06", key: "pipeline", label: "Pipeline & Stages" },
  { num: "07", key: "scoring", label: "Scoring & Forecast" },
  { num: "08", key: "mls", label: "MLS & Matching" },
  { num: "09", key: "voice", label: "Voice & Templates" },
  { num: "10", key: "integrations", label: "Integrations" },
  { num: "11", key: "privacy", label: "Data & Privacy" },
  { num: "12", key: "team", label: "Team & Access" },
  { num: "13", key: "partners", label: "Referral Partners" },
  { num: "14", key: "audit", label: "Audit Log" },
];

const ECONOMICS = [
  ["Commission split · you", "70 / 30 to cap · $23K"],
  ["Franchise / brokerage fee", "6% of GCI"],
  ["Referral fee default", "25% of Gross Commission"],
  ["Transaction fee", "$495 per side"],
  ["Target GCI · annual", "$6.5M"],
  ["Personal split · post-cap", "95 / 5"],
];
const PIPELINE_STAGES = {
  Purchases: ["Qualified", "Toured", "Offer strategy", "Offer & negotiation", "Contract", "Escrow · diligence", "Closing"],
  Listings: ["Consult", "Valuation", "Agreement", "Prep & staging", "Marketing", "Offers", "Contract", "Closing"],
  Rentals: ["Inquiry", "Qualified", "Showings", "Application", "Lease drafting", "Signed"],
};
const SCORING = [
  ["HOT threshold", "14 days since touch"],
  ["WARM threshold", "30 days since touch"],
  ["Listing threshold", "21 days since touch"],
  ["Probability model", "Calibrated from 22 closed deals"],
  ["Forecast basis", "Weighted · probability-adjusted"],
];
const MLS_MATCH = [
  ["IDX feed", "Miami MLS · Matrix · connected (mock)"],
  ["Match sensitivity", "≥ 85% fit surfaces to the queue"],
  ["Auto-search refresh", "Nightly · 02:00"],
  ["Off-market inclusion", "Whisper network + owner-direct"],
];
const VOICE_RULES = [
  ["Banned superlatives", "ultra-luxury · world-class · exclusive · iconic · best-in-class · bespoke"],
  ["Punctuation", "No exclamation marks · no emoji"],
  ["Language", "Per contact · PT / EN / ES auto-detected"],
  ["Conviction signal", "high / medium / low, always stated"],
];
const PRIVACY = [
  ["Private vault", "Visible to Principal only · agent output cannot use it"],
  ["Audit retention", "7 years · insert-only"],
  ["Rollback window", "30 days (Agent Ledger)"],
  ["LGPD / CCPA export", "On request · per contact"],
];
const PARTNERS = [
  { name: "A. Bittencourt", terms: "25% of Gross Commission · 12-mo validity", status: "Active · 4 referred" },
  { name: "R. Katz · Co-broke", terms: "Co-broke · case by case", status: "Active · 2 referred" },
  { name: "Private Banker · Itaú Miami", terms: "25% · reciprocal", status: "Active · 1 referred" },
];

const PROFILE = [
  ["Principal", "Wictor Fernando Arraes, PA"],
  ["License", "SL3232361 · Xcellence Realty"],
  ["Brokerage", "ARRAES & CO — A/CO, Miami"],
  ["Email", "wictor@arraes.com"],
  ["Signature", "Wictor Arraes · on file"],
  ["Default language", "PT · auto-detect per contact"],
];

const INTEGRATIONS = [
  ["Google Workspace", "Auth · Gmail · Calendar", "Connected · mock"],
  ["Google Drive", "1 folder per deal / contact", "Connected · mock"],
  ["WhatsApp Business", "1:1 threads, agent drafts", "Connected · mock"],
  ["IDX / MLS", "Listing search & matches", "Connected · mock"],
];

export function Settings() {
  const [active, setActive] = useState("profile");
  const [autonomy, setAutonomy] = useState<{ autonomous: string[]; approval_required: string[] } | null>(null);
  const [cadences, setCadences] = useState<SettingRow | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [onFlags, setOnFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void getById<SettingRow>("settings", "autonomy_rules").then((r) => {
      if (r) {
        const a = { autonomous: (r.autonomous as string[]) ?? [], approval_required: (r.approval_required as string[]) ?? [] };
        setAutonomy(a);
        const flags: Record<string, boolean> = {};
        a.autonomous.forEach((x) => (flags[x] = true));
        a.approval_required.forEach((x) => (flags[x] = false));
        setOnFlags(flags);
      }
    });
    void getById<SettingRow>("settings", "cadences").then((r) => setCadences(r ?? null));
    void getById<SettingRow>("settings", "contact_types").then((r) => setTypes((r?.types as string[]) ?? []));
  }, []);

  useEffect(() => {
    const read = () => getAuditLog().then(setAudit);
    read();
    return onDataChange(() => read());
  }, []);

  async function toggleAutonomy(rule: string) {
    if (!autonomy) return;
    const nowOn = !onFlags[rule];
    setOnFlags((f) => ({ ...f, [rule]: nowOn }));
    const next = {
      ...autonomy,
      autonomous: nowOn ? [...new Set([...autonomy.autonomous, rule])] : autonomy.autonomous.filter((x) => x !== rule),
      approval_required: nowOn ? autonomy.approval_required.filter((x) => x !== rule) : [...new Set([...autonomy.approval_required, rule])],
    };
    setAutonomy(next);
    await save("settings", { id: "autonomy_rules", ...next }, {
      actor: "user",
      skill: "compliance",
      action: `Autonomy ${nowOn ? "granted" : "restricted"} — ${rule}`,
    });
  }

  const allRules = useMemo(
    () => [...(autonomy?.autonomous ?? []), ...(autonomy?.approval_required ?? [])],
    [autonomy],
  );

  return (
    <div className="st-wrap">
      <div className="st-rail">
        <div className="st-rail-title">Sections</div>
        {SECTIONS.map((s) => (
          <div key={s.key} className={`st-rail-item${active === s.key ? " active" : ""}`} onClick={() => setActive(s.key)}>
            <span className="st-rail-num">{s.num}</span>
            <span className="st-rail-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="st-content">
        {active === "profile" && (
          <Section num="01" title="Profile" desc="The identity the system writes with — drafts, documents, signatures.">
            <div className="st-grid">
              {PROFILE.map(([l, v]) => (
                <div className="st-field" key={l}><span className="st-field-label">{l}</span><span className="st-field-value">{v}</span></div>
              ))}
            </div>
          </Section>
        )}

        {active === "team" && (
          <Section num="12" title="Team & Access" desc="Seats, view-as preview, and per-role commission — each role sees a filtered nav (README §5).">
            <div className="st-auto-h">Roles</div>
            <div className="st-chips">
              {["Sales Agent", "Admin", "Transaction Coordinator", "Marketing", "Referral Partner"].map((r) => (
                <span className="st-chip" key={r}>{r}</span>
              ))}
            </div>
            <div className="st-auto-h" style={{ marginTop: 18 }}>Members</div>
            {[["Wictor Arraes", "Principal · Admin", "70/30 to cap"], ["A/CO TC", "Transaction Coordinator", "flat / transaction"], ["Marketing seat", "Marketing", "—"]].map(([n, role, comm]) => (
              <div className="st-int-row" key={n}><div><div className="st-int-name">{n}</div><div className="st-int-desc">{role}</div></div><span className="st-int-status">{comm}</span></div>
            ))}
          </Section>
        )}

        {active === "autonomy" && (
          <Section num="03" title="Agent Autonomy" desc="What the agent may do alone vs. what needs your approval. Read at runtime — nothing hard-coded (README §12).">
            <div className="st-auto-group">
              {allRules.map((rule) => (
                <div className="st-auto-row" key={rule}>
                  <span className="st-auto-text">{rule}</span>
                  <div className={`st-toggle${onFlags[rule] ? " on" : ""}`} onClick={() => void toggleAutonomy(rule)} title={onFlags[rule] ? "Autonomous" : "Approval required"} />
                </div>
              ))}
            </div>
            <div className="st-auto-note">Green = the agent acts autonomously. Off = it stages the action and waits for your approval. Autonomy expands only after 90 days of audited history.</div>
          </Section>
        )}

        {active === "cadences" && (
          <Section num="04" title="Status Cadences" desc="Each status arms a touch cadence — the single source the contact screen reads.">
            {cadences && Object.entries(cadences).filter(([k]) => k !== "id").map(([status, value]) => (
              <div className="st-cad-row" key={status}><span className="st-cad-status">{status}</span><span className="st-cad-value">{String(value)}</span></div>
            ))}
          </Section>
        )}

        {active === "types" && (
          <Section num="02" title="Contact Types" desc="The classification vocabulary applied across the directory and records.">
            <div className="st-chips">{types.map((t) => <span className="st-chip" key={t}>{t}</span>)}<span className="st-chip" style={{ borderStyle: "dashed", color: "var(--gray-meta)" }}>+ add type</span></div>
          </Section>
        )}

        {active === "economics" && (
          <Section num="05" title="Economics" desc="Splits, fees and targets the agent uses to compute weighted GCI and forecasts.">
            <div className="st-grid">{ECONOMICS.map(([l, v]) => <div className="st-field" key={l}><span className="st-field-label">{l}</span><span className="st-field-value">{v}</span></div>)}</div>
          </Section>
        )}

        {active === "pipeline" && (
          <Section num="06" title="Pipeline & Stages" desc="The stage tracks each division runs — the board and playbooks read from here.">
            {Object.entries(PIPELINE_STAGES).map(([pipe, stages]) => (
              <div key={pipe} style={{ marginBottom: 18 }}>
                <div className="st-auto-h">{pipe}</div>
                <div className="st-chips">{stages.map((s) => <span className="st-chip" key={s}>{s}</span>)}</div>
              </div>
            ))}
          </Section>
        )}

        {active === "scoring" && (
          <Section num="07" title="Scoring & Forecast" desc="Aging thresholds and the probability model behind heat and weighted GCI.">
            <div className="st-grid">{SCORING.map(([l, v]) => <div className="st-field" key={l}><span className="st-field-label">{l}</span><span className="st-field-value">{v}</span></div>)}</div>
          </Section>
        )}

        {active === "mls" && (
          <Section num="08" title="MLS & Matching" desc="How the agent sources and ranks inventory against each buyer profile.">
            <div className="st-grid">{MLS_MATCH.map(([l, v]) => <div className="st-field" key={l}><span className="st-field-label">{l}</span><span className="st-field-value">{v}</span></div>)}</div>
          </Section>
        )}

        {active === "voice" && (
          <Section num="09" title="Voice & Templates" desc="The Constitution voice rules every draft obeys (README §12).">
            <div className="st-grid">{VOICE_RULES.map(([l, v]) => <div className="st-field" key={l}><span className="st-field-label">{l}</span><span className="st-field-value">{v}</span></div>)}</div>
          </Section>
        )}

        {active === "integrations" && (
          <Section num="10" title="Integrations" desc="Phase 1 runs every integration behind a mock adapter — the interface is real, the backend is stubbed.">
            {INTEGRATIONS.map(([name, desc, status]) => (
              <div className="st-int-row" key={name}>
                <div><div className="st-int-name">{name}</div><div className="st-int-desc">{desc}</div></div>
                <span className="st-int-status mock">{status}</span>
              </div>
            ))}
          </Section>
        )}

        {active === "privacy" && (
          <Section num="11" title="Data & Privacy" desc="The vault, retention and regulatory export controls.">
            <div className="st-grid">{PRIVACY.map(([l, v]) => <div className="st-field" key={l}><span className="st-field-label">{l}</span><span className="st-field-value">{v}</span></div>)}</div>
          </Section>
        )}

        {active === "partners" && (
          <Section num="13" title="Referral Partners" desc="Standing referral agreements and their terms — payouts flow through here.">
            {PARTNERS.map((p) => (
              <div className="st-int-row" key={p.name}>
                <div><div className="st-int-name">{p.name}</div><div className="st-int-desc">{p.terms}</div></div>
                <span className="st-int-status">{p.status}</span>
              </div>
            ))}
          </Section>
        )}

        {active === "audit" && (
          <Section num="14" title="Audit Log" desc="Every mutation, insert-only — actor · action · entity · timestamp (Law 2). Retained 7 years; rollback 30 days.">
            {audit.length === 0 ? (
              <div className="st-audit-empty">No entries yet — approve a draft or edit a field to see the trail populate.</div>
            ) : (
              audit.slice(0, 50).map((e) => (
                <div className="st-audit-row" key={e.id}>
                  <span className={`st-audit-actor ${e.actor}`}>{e.actor}</span>
                  <span className="st-audit-skill">{e.skill ?? ""}</span>
                  <span className="st-audit-action">{e.action}</span>
                  <span className="st-audit-time">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ num, title, desc, children }: { num: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="st-section">
      <div className="st-sec-head"><span className="st-sec-num">{num}</span><span className="st-sec-title">{title}</span></div>
      <div className="st-sec-desc">{desc}</div>
      {children}
    </section>
  );
}
