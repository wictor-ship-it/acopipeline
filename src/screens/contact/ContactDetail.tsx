import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import content from "../../data/seed/content.json";
import type { Contact, ContactStatus } from "../../domain/types";
import { getById, recordAction, save } from "../../data/repository";
import { agentService } from "../../agent/MockAgentService";
import "./ContactDetail.css";

type Seg = "profile" | "now" | "agent";
const E = content.contactDetailExtras;
const STATUS: ContactStatus[] = ["hot", "warm", "nurturing", "won", "lost"];
const STATUS_LABEL: Record<ContactStatus, string> = { hot: "Hot", warm: "Warm", nurturing: "Nurturing", won: "Won", lost: "Lost" };

export function ContactDetail() {
  const { id } = useParams();
  const [seg, setSeg] = useState<Seg>("now");
  const [contact, setContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (id) getById<Contact>("contacts", id).then((c) => setContact(c ?? null));
  }, [id]);

  if (!contact) return <div className="cd-body">Loading…</div>;
  const isReference = id === "marcelo";

  async function onStatusChange(next: ContactStatus) {
    if (!contact) return;
    await save("contacts", { ...contact, status: next }, {
      actor: "user",
      action: `Status changed — ${contact.name} → ${STATUS_LABEL[next]} (arms cadence)`,
    });
    setContact({ ...contact, status: next });
  }

  return (
    <div>
      <div className="cd-header">
        <div className="cd-eyebrow">
          {contact.relationship?.split("·")[1]?.trim() ?? contact.category} · {contact.location} · since {contact.since} · <span className="cd-edit">edit ›</span>
        </div>
        <div className="cd-head-top">
          <span className="cd-name">{contact.name}</span>
          <select className="cd-status-select" value={contact.status} onChange={(e) => void onStatusChange(e.target.value as ContactStatus)}>
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select className="cd-type-select" defaultValue={contact.relationship?.split("·")[1]?.trim() ?? "Buyer"}>
            {E.typeOptions.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="cd-contacts-line">{contact.phone} &nbsp;·&nbsp; {contact.email}</div>
        <div className="cd-essence">{isReference ? E.essence : contact.narrative}</div>
        {isReference && (
          <div className="cd-referral">
            <span className="dot" />
            <span className="txt">Referral — {E.referralLine.by} · registered {E.referralLine.registered} · protected to {E.referralLine.protectedTo} · {E.referralLine.left}</span>
          </div>
        )}
        <div className="cd-vitals">
          {(isReference ? (E.vitals as Vital[]) : synthVitals(contact)).map((v) => (
            <div className="cd-vital" key={v.label}>
              <div className="cd-vital-label">{v.label}</div>
              <div className="cd-vital-value">{v.value}</div>
              {v.periods && (
                <div className="cd-vital-periods">
                  {v.periods.map((p) => <span className="cd-vital-period" key={p.p}><span className="p">{p.p}</span>{p.v}</span>)}
                </div>
              )}
              {v.sub && <div className="cd-vital-sub">{v.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="cd-segments">
        {(["profile", "now", "agent"] as Seg[]).map((s) => (
          <button key={s} className={`cd-seg${seg === s ? " active" : ""}`} onClick={() => setSeg(s)}>
            {s === "profile" ? "Profile" : s === "now" ? "Now" : "Agent"}
          </button>
        ))}
      </div>

      <div className="cd-body">
        {seg === "now" && <NowSection contact={contact} isReference={isReference} />}
        {seg === "agent" && <AgentSection contact={contact} />}
        {seg === "profile" && <ProfileSection contact={contact} isReference={isReference} />}
      </div>
    </div>
  );
}

interface Vital {
  label: string;
  value: string;
  periods?: { p: string; v: string }[];
  sub?: string;
}

function synthVitals(c: Contact): Vital[] {
  return [
    { label: "Lifetime GCI", value: c.lifetime_gci ?? "—" },
    { label: "Last Contact", value: c.last_touch ?? "—" },
    { label: "Active Deals", value: c.active_deals ?? "0" },
    { label: "Deals Won", value: c.deals_won ?? "0" },
  ];
}

function NowSection({ contact, isReference }: { contact: Contact; isReference: boolean }) {
  const [sent, setSent] = useState(false);

  function approve() {
    setSent(true);
    void recordAction(
      { actor: "user", skill: "senior-advisor", action: `Approved & sent (mock) — ${contact.name}` },
      `contact/${contact.id}/now`,
      () => setSent(false),
    );
  }

  return (
    <>
      <div className="cd-sec">
        <div className="cd-sec-title">Now — this relationship's queue</div>
        {sent ? (
          <div className="cd-now-item"><span className="cd-sent">Sent ✓ · logged — undo available</span></div>
        ) : (
          <div className="cd-now-item">
            <div className="cd-now-label">{isReference ? E.nowAction.label : `${contact.status.toUpperCase()} · cadence`}</div>
            <div className="cd-now-head">{isReference ? E.nowAction.head : (contact.agent_note ?? "Next touch queued")}</div>
            {isReference && <div className="cd-now-draft">{E.nowAction.draft}</div>}
            <div className="cd-actions-row">
              <button className="cd-btn cd-btn-primary" onClick={approve}>Approve &amp; send</button>
              <button className="cd-btn cd-btn-ghost">Edit</button>
              <button className="cd-btn cd-btn-ghost" onClick={approve}>Skip</button>
            </div>
          </div>
        )}
      </div>

      {isReference && (
        <>
          <div className="cd-sec">
            <div className="cd-sec-title">Relationship signals</div>
            {E.relationshipSignals.map((s, i) => (
              <div className="cd-signal" key={i}><span className="dot" style={{ background: s.dot }} /><span className="txt">{s.text}</span></div>
            ))}
          </div>
          <div className="cd-sec">
            <div className="cd-sec-title">Plan</div>
            {E.planItems.map((p, i) => (
              <div className="cd-tl-row" key={i}>
                <span className="cd-tl-date">{p.d}</span>
                <div style={{ flex: 1 }}><div className="cd-tl-what">{p.what}</div><div className="cd-tl-why">{p.why}</div></div>
                <span className="cd-tl-status">{p.st}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="cd-sec">
        <div className="cd-sec-title">Memory</div>
        <div className="cd-tl-row">
          <span className="cd-tl-date">{contact.last_touch}</span>
          <div style={{ flex: 1 }}><div className="cd-tl-why" style={{ fontSize: 13, color: "var(--body)" }}>{contact.narrative}</div></div>
        </div>
      </div>
    </>
  );
}

function AgentSection({ contact }: { contact: Contact }) {
  const [msgs, setMsgs] = useState<{ role: "agent" | "user"; text: string }[]>([
    { role: "agent", text: contact.agent_note ?? "How can I help with this relationship?" },
  ]);
  const [input, setInput] = useState("");
  const [over, setOver] = useState(false);

  async function send() {
    const t = input.trim();
    if (!t) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: t }]);
    const { reply } = await agentService.ask(t);
    setMsgs((m) => [...m, { role: "agent", text: reply }]);
  }

  return (
    <div className="cd-sec">
      <div className="cd-sec-title">Agent · this relationship</div>
      <div className="cd-chat">
        {msgs.map((m, i) => (
          <div key={i} className={`cd-chat-msg ${m.role === "agent" ? "cd-chat-agent" : "cd-chat-user"}`}>{m.text}</div>
        ))}
      </div>
      <div className="cd-chat-input">
        <input placeholder="Ask the agent…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} />
        <button className="cd-btn cd-btn-primary" onClick={() => void send()}>Send</button>
      </div>
      <div
        className={`cd-drop${over ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); }}
      >
        Drop documents here → filed to this contact's Drive folder (mock)
      </div>
    </div>
  );
}

function ProfileSection({ contact, isReference }: { contact: Contact; isReference: boolean }) {
  const [mandate, setMandate] = useState("");
  const prefs = (contact.preferences ?? {}) as Record<string, string>;

  return (
    <>
      <div className="cd-mandate">
        <div className="cd-mandate-label">Agent mandate</div>
        <textarea placeholder={E.mandatePlaceholder} value={mandate} onChange={(e) => setMandate(e.target.value)} />
      </div>

      <div className="cd-sec">
        <div className="cd-sec-title">Classification</div>
        <div className="cd-cadence-note">Cadence for {contact.status}: {E.cadenceByStatus[contact.status as keyof typeof E.cadenceByStatus]}</div>
        <div className="cd-manage-link" style={{ marginTop: 6 }}>manage in Settings ›</div>
      </div>

      {isReference && (
        <div className="cd-sec">
          <div className="cd-sec-title">Identity file</div>
          {Object.entries(E.identitySections).map(([group, fields]) => (
            <div className="cd-idgroup" key={group}>
              <div className="cd-idgroup-title">{group}</div>
              {Object.entries(fields as Record<string, string>)
                .filter(([, v]) => v !== "")
                .map(([k, v]) => (
                  <div className="cd-idrow" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
                ))}
            </div>
          ))}
        </div>
      )}

      {Object.keys(prefs).length > 0 && (
        <div className="cd-sec">
          <div className="cd-sec-title">Preferences</div>
          <div className="cd-pref-grid">
            {Object.entries(prefs).map(([k, v]) => (
              <div className="cd-idrow" key={k}><span className="k">{k}</span><span className="v">{String(v)}</span></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
