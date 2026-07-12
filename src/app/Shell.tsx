import { Outlet, useLocation } from "react-router-dom";
import { useAppState } from "./state";
import { ROLES } from "./roles";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { UndoBar } from "./UndoBar";
import { ErrorBoundary } from "./ErrorBoundary";
import "./Shell.css";

/* App shell — literal from fragment 00: layout flex (line 130), ambient
   base + 3 blobs (160-163), view-as bar (152-158), sidebar, main canvas
   (210), top bar. */
export function Shell() {
  const { viewAsActive, viewAs, exitViewAs } = useAppState();
  const vaRole = ROLES.find((r) => r.id === viewAs)?.label ?? "";
  const { pathname } = useLocation();

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

      <Sidebar />

      <main className="app-canvas">
        <TopBar />
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <UndoBar />
    </div>
  );
}
