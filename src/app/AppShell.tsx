import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { UndoBar } from "./UndoBar";
import { undoStack } from "../data/repository";
import { titleForPath, topbarHidden } from "./titles";
import "./AppShell.css";

export function AppShell() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);
  const hideTop = topbarHidden(pathname);

  // ⌘Z / Ctrl+Z outside inputs = undo last action (Law 3, prototype parity)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "z" &&
        tag !== "INPUT" &&
        tag !== "TEXTAREA"
      ) {
        e.preventDefault();
        void undoStack.undoLast();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Sidebar />
      <div className="app-content">
        {!hideTop && (
          <header className="topbar">
            <span className="topbar-title">{title}</span>
          </header>
        )}
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <UndoBar />
    </>
  );
}
