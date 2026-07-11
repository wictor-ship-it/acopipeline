import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import content from "../../data/seed/content.json";
import type { Contact, Draft, Language, Message, Thread } from "../../domain/types";
import { useCollection } from "../../data/hooks";
import { agentService } from "../../agent/MockAgentService";
import "./Inbox.css";

const META = content.inboxMeta;
const CHANNELS = ["All", "WhatsApp", "Email", "SMS"];

export function Inbox() {
  const { items: threads } = useCollection<Thread>("threads");
  const { items: messages } = useCollection<Message>("messages");
  const { items: contacts } = useCollection<Contact>("contacts");
  const { items: drafts } = useCollection<Draft>("drafts");

  const [channel, setChannel] = useState("All");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const contactName = (cid: string) => contacts.find((c) => c.id === cid)?.name ?? cid;
  const contactLang = (cid: string): Language => contacts.find((c) => c.id === cid)?.language[0] ?? "EN";

  const visibleThreads = useMemo(() => {
    let list = threads;
    if (channel !== "All") list = list.filter((t) => t.channel === channel.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => contactName(t.contact_id).toLowerCase().includes(q) || (t.subject ?? "").toLowerCase().includes(q));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, channel, search, contacts]);

  const active = threads.find((t) => t.id === activeId) ?? visibleThreads[0] ?? null;
  const convMessages = active ? messages.filter((m) => m.thread_id === active.id) : [];
  const pendingDraft = active ? drafts.find((d) => d.target.id === active.contact_id && d.status === "pending") : undefined;

  return (
    <div className="ib-wrap">
      <div className="ib-threads">
        <div className="ib-search-wrap">
          <input className="ib-search" placeholder={META.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="ib-filters">
          {CHANNELS.map((c) => (
            <div key={c} className={`ib-filter${channel === c ? " active" : ""}`} onClick={() => setChannel(c)}>{c}</div>
          ))}
        </div>
        <div className="ib-thread-list">
          {visibleThreads.map((t) => {
            const last = messages.filter((m) => m.thread_id === t.id).slice(-1)[0];
            const preview = last ? (last.dir === "out" ? `You: ${last.body}` : last.body) : t.subject;
            return (
              <div key={t.id} className={`ib-thread${active?.id === t.id ? " active" : ""}`} onClick={() => setActiveId(t.id)}>
                <div className="ib-avatar">{t.initials}</div>
                <div className="ib-thread-main">
                  <div className="ib-thread-top">
                    <span className="ib-thread-name">{contactName(t.contact_id)}</span>
                    <span className="ib-thread-time">{t.last_time}</span>
                  </div>
                  <div className="ib-thread-preview-row">
                    <span className="ib-chan-pill">{t.channel}</span>
                    <span className="ib-thread-preview">{preview}</span>
                  </div>
                </div>
                {t.unread_count ? <span className="ib-unread">{t.unread_count}</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      {active ? (
        <Conversation
          key={active.id}
          thread={active}
          name={contactName(active.contact_id)}
          lang={contactLang(active.contact_id)}
          messages={convMessages}
          draft={pendingDraft}
          contactId={active.contact_id}
        />
      ) : (
        <div className="ib-conv" style={{ alignItems: "center", justifyContent: "center", color: "var(--gray-meta)" }}>
          No conversation selected
        </div>
      )}
    </div>
  );
}

function Conversation({ thread, name, lang, messages, draft, contactId }: {
  thread: Thread; name: string; lang: Language; messages: Message[]; draft?: Draft; contactId: string;
}) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [sentLog, setSentLog] = useState<Message[]>([]);
  const [draftResolved, setDraftResolved] = useState(false);
  const quick = META.quickReplies[lang] ?? META.quickReplies.EN;
  const first = name.split(" ")[0];

  function send(body: string) {
    const t = body.trim();
    if (!t) return;
    setText("");
    setSentLog((s) => [...s, { id: `local_${s.length}`, thread_id: thread.id, dir: "out", body: t, at: "now" }]);
  }

  return (
    <div className="ib-conv">
      <div className="ib-conv-head">
        <div className="ib-conv-head-left">
          <div className="ib-conv-name">{name}</div>
          <div className="ib-conv-sub">{thread.subject} · {thread.channel}</div>
        </div>
        <div className="ib-conv-actions">
          <button className="ib-conv-btn" onClick={() => navigate("/opportunities")}>Open Deal</button>
          <button className="ib-conv-btn" onClick={() => navigate(`/contact/${contactId}`)}>Contact</button>
        </div>
      </div>

      <div className="ib-messages">
        {messages.map((m) => (
          <div key={m.id} className={`ib-msg ${m.dir}`}>
            {m.body}
            <div className="ib-msg-time">{m.at}</div>
          </div>
        ))}
        {sentLog.map((m) => (
          <div key={m.id} className="ib-msg out">{m.body}<div className="ib-msg-time">sent ✓</div></div>
        ))}
      </div>

      {draft && !draftResolved && (
        <div className="ib-draft">
          <div className="ib-draft-label">Agent draft · awaiting approval · {draft.language}</div>
          <div className="ib-draft-body">{draft.body}</div>
          <div className="ib-draft-actions">
            <button className="ib-btn ib-btn-primary" onClick={() => { void agentService.resolve(draft.id, "approved"); setDraftResolved(true); setSentLog((s) => [...s, { id: `d_${s.length}`, thread_id: thread.id, dir: "out", body: draft.body, at: "now" }]); }}>Approve &amp; send</button>
            <button className="ib-btn ib-btn-ghost" onClick={() => { void agentService.resolve(draft.id, "skipped"); setDraftResolved(true); }}>Skip</button>
          </div>
        </div>
      )}

      <div className="ib-composer">
        <div className="ib-quick">
          <span className="ib-quick-lang">{META.qrLangLabelFormat.replace("{LANG}", lang)}</span>
          {quick.map(([label, body]) => (
            <span key={label} className="ib-quick-chip" onClick={() => setText(body.replace("{First}", first))}>{label}</span>
          ))}
        </div>
        <div className="ib-input-row">
          <input className="ib-input" placeholder={META.composerPlaceholder} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(text); }} />
          <button className="ib-send" onClick={() => send(text)}>Send</button>
        </div>
      </div>
    </div>
  );
}
