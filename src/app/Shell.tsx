import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppState } from "./state";
import { ROLES } from "./roles";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { UndoBar } from "./UndoBar";
import { ErrorBoundary } from "./ErrorBoundary";
import { CommandPalette } from "./CommandPalette";
import "./Shell.css";

/* App shell — literal from fragment 00: layout flex (line 130), ambient
   base + 3 blobs (160-163), view-as bar (152-158), sidebar, main canvas
   (210), top bar. Mobile (<=820px): the sidebar becomes a slide-in drawer
   behind a hamburger; desktop layout is untouched (all mobile rules gated
   behind @media in Shell.css). */
export function Shell() {
  const { viewAsActive, viewAs, exitViewAs } = useAppState();
  const vaRole = ROLES.find((r) => r.id === viewAs)?.label ?? "";
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  return (
    <div className="app-layout">
      {/* ambient atmosphere (Sand & Ocean) */}
      <div className="amb-base" />
      <div className="amb-b1" />
      <div className="amb-b2" />
      <div className="amb-b3" />

      {viewAsActive && (
        <div className="va-bar">
          <span className="va-dot" />
          <span className="va-text">Viewing as <strong>Wictor Arraes</strong> · {vaRole} — navigation scoped to role</span>
          <span className="va-exit" onClick={exitViewAs}>Exit</span>
        </div>
      )}

      {/* Mobile-only header: hamburger + brand (hidden on desktop). */}
      <header className="mobile-header">
        <button className="mh-burger" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="mh-brand">A/CO</div>
      </header>

      {navOpen && <div className="sb-drawer-scrim" onClick={() => setNavOpen(false)} />}
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />

      <main className="app-canvas">
        <TopBar />
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <UndoBar />
      <CommandPalette />
    </div>
  );
}
