import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getById } from "../data/repository";
import { agentService } from "../agent/MockAgentService";
import { PALETTE_COMMANDS, SHORTCUTS } from "./chrome-content";

/** Command bar + floating help + shortcuts overlay + command palette. */
export function GlobalChrome() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        setShortcutsOpen(false);
        return;
      }
      if (e.key === "Escape") { setPaletteOpen(false); setShortcutsOpen(false); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") { e.preventDefault(); setShortcutsOpen((o) => !o); setPaletteOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showBar = !pathname.startsWith("/welcome") && !pathname.startsWith("/inbox");

  return (
    <>
      {showBar && <CommandBar />}
      <div className="help-fab" title="Shortcuts · press ?" onClick={() => setShortcutsOpen(true)}>?</div>
      {shortcutsOpen && <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onRun={(to) => { setPaletteOpen(false); navigate(to); }} />}
    </>
  );
}

function CommandBar() {
  const { pathname } = useLocation();
  const params = useParams();
  const [text, setText] = useState("");
  const [reply, setReply] = useState<{ q: string; a: string } | null>(null);
  const [ctx, setCtx] = useState<string | null>(null);

  // Context chip from the current record.
  useEffect(() => {
    let alive = true;
    const idMatch = pathname.match(/^\/(contact|deal|dealpage)\/([^/]+)/);
    if (idMatch) {
      const isContact = idMatch[1] === "contact";
      const store = isContact ? "contacts" : "opportunities";
      void getById<{ id: string; name?: string }>(store as "contacts" | "opportunities", idMatch[2]).then((r) => {
        if (!alive) return;
        if (!r?.name) { setCtx(null); return; }
        // Contacts → first name; deals → the property name before the "·".
        setCtx(isContact ? r.name.split(" ")[0] : r.name.split("·")[0].trim());
      });
    } else {
      setCtx(null);
    }
    return () => { alive = false; };
  }, [pathname, params]);

  async function submit() {
    const q = text.trim();
    if (!q) return;
    setText("");
    const { reply: a } = await agentService.ask(q);
    setReply({ q, a });
  }

  return (
    <div className="cb">
      {reply && (
        <div className="cb-reply">
          <button className="cb-reply-close" onClick={() => setReply(null)}>×</button>
          <div className="cb-reply-q">“{reply.q}”</div>
          <div className="cb-reply-a">{reply.a}</div>
        </div>
      )}
      <div className="cb-inner">
        <button className="cb-plus" title="Upload contract / document — agent extracts terms">+</button>
        {ctx && <span className="cb-ctx">in {ctx}</span>}
        <input
          className="cb-input"
          placeholder='Ask, command or dictate — "log a call with Marcelo, it advanced"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
        />
        <span className="cb-v">V</span>
        <button className="cb-mic" title="Dictate">🎙</button>
      </div>
    </div>
  );
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="ov-scrim" onClick={onClose} />
      <div className="ov-panel">
        <div className="ov-head">
          <span className="ov-title">Shortcuts</span>
          <span className="ov-hint">esc to close</span>
        </div>
        <div className="ov-body">
          {SHORTCUTS.map((g) => (
            <div className="sc-group" key={g.label}>
              <div className="sc-group-label">{g.label}</div>
              {g.keys.map((k) => (
                <div className="sc-row" key={k.k}>
                  <span className="sc-desc">{k.d}</span>
                  <span className="sc-key">{k.k}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CommandPalette({ onClose, onRun }: { onClose: () => void; onRun: (to: string) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const results = useMemo(
    () => PALETTE_COMMANDS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  return (
    <>
      <div className="ov-scrim" onClick={onClose} />
      <div className="ov-panel">
        <input
          className="pal-input"
          autoFocus
          placeholder="Type a command or search…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            else if (e.key === "Enter") { const r = results[sel]; if (r) onRun(r.to); }
          }}
        />
        <div className="ov-body">
          {results.length === 0 && <div className="pal-empty">No matches — press Enter to ask the agent instead.</div>}
          {results.map((c, i) => (
            <div key={c.label} className={`pal-row${i === sel ? " sel" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => onRun(c.to)}>
              <span className="pal-label">{c.label}</span>
              <span className="pal-hint">{c.hint}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 20px", fontSize: 10, letterSpacing: "0.06em", color: "var(--gray-meta)" }}>↑↓ navigate · ↵ run · esc close</div>
      </div>
    </>
  );
}
