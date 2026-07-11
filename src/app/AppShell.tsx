import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { titleForPath, topbarHidden } from "./titles";
import "./AppShell.css";

export function AppShell() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);
  const hideTop = topbarHidden(pathname);

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
    </>
  );
}
