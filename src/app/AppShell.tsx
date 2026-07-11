import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { GlobalChrome } from "./GlobalChrome";
import { UndoBar } from "./UndoBar";
import { undoStack } from "../data/repository";
import "./AppShell.css";
import "./chrome.css";

export function AppShell() {
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
        <main className="app-canvas">
          <TopBar />
          <div className="app-scroll">
            <Outlet />
          </div>
        </main>
      </div>
      <UndoBar />
      <GlobalChrome />
    </>
  );
}
