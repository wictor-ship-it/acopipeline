import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollection } from "../data/hooks";
import type { Contact } from "../domain/types";
import { orderedDeals } from "../screens/opportunities/data";

/* ⌘K command palette. Opens on Cmd/Ctrl+K (global) or the sidebar chips
   (which dispatch the `aco:cmdk` event). Search jumps to any screen, contact,
   or deal; ↑↓ navigate, ⏎ open, esc close. Glass overlay per the visual law. */

const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const SCREENS: Array<{ label: string; path: string; kw: string }> = [
  { label: "Command Center", path: "/welcome", kw: "welcome home brief ask" },
  { label: "Intelligence", path: "/intelligence", kw: "cockpit act now risk radar plays performance" },
  { label: "Contacts", path: "/contacts", kw: "people directory touch today queue" },
  { label: "Opportunities", path: "/opportunities", kw: "pipeline deals board list week" },
  { label: "Inbox", path: "/inbox", kw: "messages conversations whatsapp email sms" },
  { label: "Reports", path: "/reports", kw: "analytics forecast gci income" },
  { label: "Settings", path: "/settings", kw: "config integrations cadence autonomy profile" },
];

type Cmd = { kind: "screen" | "contact" | "deal"; label: string; sub: string; path: string };
const DOT: Record<Cmd["kind"], string> = { screen: "#0D0D0D", contact: "#10A37F", deal: "#5D5D5D" };

export function CommandPalette() {
  const navigate = useNavigate();
  const { items: contacts } = useCollection<Contact>("contacts");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global open/close: Cmd/Ctrl+K toggles; Esc closes. Sidebar chips fire `aco:cmdk`.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("aco:cmdk", onOpen as EventListener);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("aco:cmdk", onOpen as EventListener); };
  }, []);

  useEffect(() => {
    if (open) { setQ(""); setIdx(0); const t = setTimeout(() => inputRef.current?.focus(), 0); return () => clearTimeout(t); }
  }, [open]);

  const results = useMemo<Cmd[]>(() => {
    const query = q.trim().toLowerCase();
    const screens: Cmd[] = SCREENS
      .filter((s) => !query || (`${s.label} ${s.kw}`).toLowerCase().includes(query))
      .map((s) => ({ kind: "screen", label: s.label, sub: "Go to", path: s.path }));
    const cts: Cmd[] = query
      ? contacts.filter((c) => c.name?.toLowerCase().includes(query)).slice(0, 6)
          .map((c) => ({ kind: "contact", label: c.name, sub: "Contact", path: `/contacts/${c.id}` }))
      : [];
    const deals: Cmd[] = query
      ? orderedDeals().filter((d) => d.name.toLowerCase().includes(query)).slice(0, 6)
          .map((d) => ({ kind: "deal", label: d.name, sub: `Deal · ${d.stage}`, path: `/deal/${encodeURIComponent(d.name)}` }))
      : [];
    return [...screens, ...cts, ...deals].slice(0, 24);
  }, [q, contacts]);

  useEffect(() => { setIdx((i) => Math.min(i, Math.max(0, results.length - 1))); }, [results.length]);

  if (!open) return null;

  const go = (c?: Cmd) => { const t = c ?? results[idx]; if (!t) return; setOpen(false); navigate(t.path); };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(13,13,13,0.28)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); go(); }
        }}
        style={{ width: 560, maxWidth: "92vw", borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.82)", backdropFilter: "blur(30px) saturate(1.8)", WebkitBackdropFilter: "blur(30px) saturate(1.8)", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 24px 70px rgba(0,0,0,0.22)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #E3E3E3" }}>
          <span style={{ fontFamily: SANS, fontWeight: 200, fontSize: 14, letterSpacing: "0.05em", color: "#8F8F8F", flex: "none" }}>⌘K</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search screens, contacts, deals…" className="cmdk-input" style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontFamily: SANS, fontWeight: 400, fontSize: 15.5, color: "#0D0D0D" }} />
          <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: 10, letterSpacing: "0.08em", color: "#B8B8B8", flex: "none" }}>ESC</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
          {results.length === 0 && <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 13, color: "#8F8F8F", padding: "16px 20px" }}>No matches.</div>}
          {results.map((c, i) => (
            <div key={`${c.kind}:${c.path}`} onMouseEnter={() => setIdx(i)} onClick={() => go(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer", background: i === idx ? "rgba(13,13,13,0.06)" : "transparent" }}>
              <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: DOT[c.kind] }} />
              <span style={{ flex: 1, minWidth: 0, fontFamily: SANS, fontWeight: 400, fontSize: 14, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
              <span style={{ flex: "none", fontFamily: SANS, fontWeight: 400, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "#8F8F8F" }}>{c.sub}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 20px", borderTop: "1px solid #E3E3E3", fontFamily: SANS, fontWeight: 400, fontSize: 11, color: "#8F8F8F" }}>
          <span>↑↓ navigate</span>
          <span>⏎ open</span>
          <span>esc close</span>
          <span style={{ flex: 1 }} />
          <span>In queues: ↑↓ move · ⏎ approve · S skip</span>
        </div>
      </div>
    </div>
  );
}
