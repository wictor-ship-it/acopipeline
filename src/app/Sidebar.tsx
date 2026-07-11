import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppState } from "./state";
import { ROLES, navForRole, homePathForRole, type Role } from "./roles";

/* Sidebar — literal from fragment 00 lines 166-207; SIDE_BASE (rounded
   floating 230px glass panel) from logic-and-data.js line 3602. */
export function Sidebar() {
  const { viewAs, setViewAs, signOut, inboxUnread } = useAppState();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const items = navForRole(viewAs);

  function onRole(r: Role) {
    setViewAs(r);
    setMenuOpen(false);
    setViewAsOpen(false);
    navigate(homePathForRole(r));
  }
  const roleLabel = ROLES.find((r) => r.id === viewAs)?.label ?? "Admin";

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-logo">A/CO</div>
        <div className="sb-sub">Pipeline Intelligence</div>
      </div>

      <nav className="sb-nav">
        {items.map((it) => (
          <NavLink key={it.path} to={it.path} className={({ isActive }) => (isActive ? "sb-item active" : "sb-item")}>
            <span>{it.label}</span>
            {it.badge === "inbox-unread" && inboxUnread > 0 && <span className="sb-badge">{inboxUnread}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sb-footer">
        <div className="sb-profile-wrap">
          {menuOpen && (
            <>
              <div className="sb-menu-scrim" onClick={() => { setMenuOpen(false); setViewAsOpen(false); }} />
              <div className="sb-menu">
                <div className="sb-menu-item" onClick={() => { setMenuOpen(false); navigate("/settings"); }}>Settings</div>
                <div className="sb-menu-item" onClick={() => setViewAsOpen((o) => !o)}>
                  <span>View as</span><span className="sb-menu-role">{roleLabel} ▸</span>
                </div>
                {viewAsOpen && ROLES.map((r) => (
                  <div key={r.id} className={`sb-menu-sub${viewAs === r.id ? " active" : ""}`} onClick={() => onRole(r.id)}>{r.label}</div>
                ))}
                <div className="sb-menu-item danger" onClick={signOut}>Sign out</div>
              </div>
            </>
          )}
          <div className="sb-profile" onClick={() => setMenuOpen((o) => !o)}>
            <div className="sb-profile-top">
              <span className="sb-profile-name">Wictor Arraes</span>
              <span className="sb-gear">⚙</span>
            </div>
            <div className="sb-profile-role">Principal</div>
          </div>
        </div>

        <div className="sb-status">
          <div className="sb-agent"><span className="sb-agent-dot" /><span>Agent · active</span></div>
          <div className="sb-chips">
            <span className="sb-chip" title="Shortcuts">?</span>
            <span className="sb-chip" title="Command palette">⌘K</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
