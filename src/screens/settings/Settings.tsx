import { useEffect, useMemo, useState } from "react";
import type { AuditEntry } from "../../domain/types";
import { getAuditLog, getById, onDataChange, save } from "../../data/repository";
import "./Settings.css";

interface SettingRow { id: string; [k: string]: unknown }

const SECTIONS = [
  { num: "01", key: "profile", label: "Profile" },
  { num: "02", key: "team", label: "Team & Roles" },
  { num: "03", key: "autonomy", label: "Agent Autonomy" },
  { num: "04", key: "cadences", label: "Status Cadences" },
  { num: "05", key: "types", label: "Contact Types" },
  { num: "06", key: "integrations", label: "Integrations" },
  { num: "07", key: "audit", label: "Audit Log" },
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
          <Section num="02" title="Team & Roles" desc="View-as switches the workspace to each seat (README §5).">
            <div className="st-chips">
              {["Sales Agent", "Admin", "Transaction Coordinator", "Marketing", "Referral Partner"].map((r) => (
                <span className="st-chip" key={r}>{r}</span>
              ))}
            </div>
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
          <Section num="05" title="Contact Types" desc="The classification vocabulary applied across the directory and records.">
            <div className="st-chips">{types.map((t) => <span className="st-chip" key={t}>{t}</span>)}</div>
          </Section>
        )}

        {active === "integrations" && (
          <Section num="06" title="Integrations" desc="Phase 1 runs every integration behind a mock adapter — the interface is real, the backend is stubbed.">
            {INTEGRATIONS.map(([name, desc, status]) => (
              <div className="st-int-row" key={name}>
                <div><div className="st-int-name">{name}</div><div className="st-int-desc">{desc}</div></div>
                <span className="st-int-status mock">{status}</span>
              </div>
            ))}
          </Section>
        )}

        {active === "audit" && (
          <Section num="07" title="Audit Log" desc="Every mutation, insert-only — actor · action · entity · timestamp (Law 2). Retained 7 years; rollback 30 days.">
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
