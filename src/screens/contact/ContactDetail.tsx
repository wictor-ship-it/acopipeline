import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import content from "../../data/seed/content.json";
import type { Activity, Contact, ContactStatus } from "../../domain/types";
import { getById, recordAction, save } from "../../data/repository";
import { useCollection } from "../../data/hooks";
import { agentService } from "../../agent/MockAgentService";
import "./ContactDetail.css";

const DEAL = content.dealDetail;

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

const CADENCE_LABEL: Record<string, string> = {
  hot: "follow-up within 24–48h",
  warm: "touch every 7 days",
  nurturing: "monthly value touch",
  won: "post-close care — quarterly + key dates",
  lost: "re-engage ping every 90d",
};

/** Synthesized relationship signals for non-reference contacts (v5 shows
 *  signals for every contact; the agent derives them from the record). */
function synthSignals(c: Contact): { dot: string; text: string }[] {
  const out: { dot: string; text: string }[] = [];
  if (c.agent_note) out.push({ dot: "#B45309", text: c.agent_note });
  out.push({ dot: "#10A37F", text: `Last touch ${c.last_touch ?? "—"} · cadence: ${CADENCE_LABEL[c.status] ?? "agent watching"}` });
  return out;
}

function synthPlan(c: Contact): { d: string; what: string; why: string; st: string }[] {
  return [
    { d: c.last_touch ?? "Soon", what: "Next touch — per status cadence", why: `${c.status} · ${CADENCE_LABEL[c.status] ?? "agent-run"}`, st: "Scheduled" },
    { d: "Ongoing", what: "Re-qualify goals against the mandate", why: "relationship check · agent prepares the brief", st: "Planned" },
  ];
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
  const { items: activities } = useCollection<Activity>("activities");
  const touches = activities.filter((a) => a.contact_id === contact.id);

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

      <div className="cd-sec">
        <div className="cd-sec-title">Relationship signals</div>
        {(isReference ? E.relationshipSignals : synthSignals(contact)).map((s, i) => (
          <div className="cd-signal" key={i}><span className="dot" style={{ background: s.dot }} /><span className="txt">{s.text}</span></div>
        ))}
      </div>
      {isReference && <MlsMatch />}

      <div className="cd-sec">
        <div className="cd-sec-title">Plan</div>
        {(isReference ? E.planItems : synthPlan(contact)).map((p, i) => (
          <div className="cd-tl-row" key={i}>
            <span className="cd-tl-date">{p.d}</span>
            <div style={{ flex: 1 }}><div className="cd-tl-what">{p.what}</div><div className="cd-tl-why">{p.why}</div></div>
            <span className="cd-tl-status">{p.st}</span>
          </div>
        ))}
      </div>

      {isReference && <AgentLearnCard />}

      <div className="cd-sec">
        <div className="cd-sec-title">Memory</div>
        {touches.length === 0 ? (
          <div className="cd-tl-row">
            <span className="cd-tl-date">{contact.last_touch}</span>
            <div style={{ flex: 1 }}><div className="cd-tl-why" style={{ fontSize: 13, color: "var(--body)" }}>{contact.narrative}</div></div>
          </div>
        ) : (
          touches.map((t) => (
            <div className="cd-tl-row" key={t.id}>
              <span className="cd-tl-date">{t.date}</span>
              <span className="cd-tl-type-tag">{t.type}</span>
              <div style={{ flex: 1 }}><div className="cd-tl-why" style={{ fontSize: 13, color: "var(--body)" }}>{t.body}</div></div>
              <span className="cd-tl-status" style={{ color: t.outcome === "advanced" ? "#10A37F" : "#8F8F8F" }}>{t.outcome}</span>
            </div>
          ))
        )}
        <FileDrop contactId={contact.id} />
      </div>
    </>
  );
}

/** MLS Match — search criteria + agent-found matches (v5 Now block). */
function MlsMatch() {
  const [open, setOpen] = useState(false);
  const matches = DEAL.nowQueue.find((q) => q.type === "mls_match")?.matches ?? [];
  return (
    <div className="cd-sec">
      <div className="cd-sec-title">MLS Match — {matches.length} matches for this search</div>
      <div className="cd-mls-note">client is PT — everything goes out in Portuguese</div>
      <button className="cd-mls-crit-toggle" onClick={() => setOpen((o) => !o)}>
        Search criteria · Buyer Requirement Profile {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="cd-mls-crit">
          {E.searchCriteriaSummary.map(([k, v]) => (
            <div className="cd-idrow" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
          ))}
        </div>
      )}
      {matches.map((m, i) => (
        <div className="cd-mls-row" key={i}>
          <span className="cd-mls-name">{m[0]}</span>
          <span className="cd-mls-price">{m[1]}</span>
          <span className="cd-mls-fit">{m[2]} fit</span>
        </div>
      ))}
      <div className="cd-actions-row">
        <button className="cd-btn cd-btn-primary">Suggest selected</button>
        <button className="cd-btn cd-btn-ghost">Draft tour</button>
      </div>
    </div>
  );
}

/** Agent-learned field card (save to profile / dismiss). */
function AgentLearnCard() {
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="cd-sec">
      <div className="cd-learn-card">
        <div className="cd-learn-eyebrow">Agent learned · save to profile</div>
        <div className="cd-learn-text">{E.agentLearnCard.text}</div>
        {done ? <div className="cd-sent">{done}</div> : (
          <div className="cd-actions-row">
            <button className="cd-btn cd-btn-primary" onClick={() => setDone("Saved to profile ✓")}>Save to profile</button>
            <button className="cd-btn cd-btn-ghost" onClick={() => setDone("Dismissed")}>Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FileDrop({ contactId }: { contactId: string }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`cd-drop${over ? " over" : ""}`}
      style={{ marginTop: 16 }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void contactId; }}
    >
      Drop documents here → filed to this contact's Drive folder (mock)
    </div>
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
        <div className="cd-class-row"><span className="cd-class-label">Status</span><span className="cd-class-val">{contact.status}</span></div>
        <div className="cd-class-row"><span className="cd-class-label">Type</span><span className="cd-class-val">{contact.relationship?.split("·")[1]?.trim() ?? contact.category}</span></div>
        <div className="cd-class-row">
          <span className="cd-class-label">Tags</span>
          <span className="cd-tags">
            {(contact.tags ?? []).map((t) => <span className="cd-tag" key={t}>{t}</span>)}
            <span className="cd-tag-add">+ add tag</span>
          </span>
        </div>
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
