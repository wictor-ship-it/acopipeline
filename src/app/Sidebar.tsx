import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppState } from "./state";
import { ROLES, navForRole, homePathForRole, type Role } from "./roles";
import "./Sidebar.css";

export function Sidebar() {
  const { viewAs, setViewAs, signOut, inboxUnread } = useAppState();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const items = navForRole(viewAs);

  function onRoleChange(role: Role) {
    setViewAs(role);
    setViewAsOpen(false);
    setMenuOpen(false);
    navigate(homePathForRole(role));
  }

  const roleLabel = ROLES.find((r) => r.id === viewAs)?.label ?? "Admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo">A/CO</div>
        <div className="sidebar-subtitle">Pipeline Intelligence</div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <span>{item.label}</span>
            {item.badge === "inbox-unread" && inboxUnread > 0 && (
              <span className="nav-badge">{inboxUnread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <div className="sidebar-profile-wrap">
          {menuOpen && (
            <>
              <div className="sidebar-menu-scrim" onClick={() => { setMenuOpen(false); setViewAsOpen(false); }} />
              <div className="sidebar-menu">
                <div className="sidebar-menu-item" onClick={() => { setMenuOpen(false); navigate("/settings"); }}>Settings</div>
                <div className="sidebar-menu-item" onClick={() => setViewAsOpen((o) => !o)}>
                  View as <span className="sidebar-menu-role">{roleLabel} ▸</span>
                </div>
                {viewAsOpen &&
                  ROLES.map((r) => (
                    <div
                      key={r.id}
                      className={`sidebar-menu-sub${viewAs === r.id ? " active" : ""}`}
                      onClick={() => onRoleChange(r.id)}
                    >
                      {r.label}
                    </div>
                  ))}
                <div className="sidebar-menu-item danger" onClick={signOut}>Sign out</div>
              </div>
            </>
          )}
          <div className="sidebar-profile" onClick={() => setMenuOpen((o) => !o)}>
            <div className="sidebar-profile-top">
              <span className="sidebar-profile-name">Wictor Arraes</span>
              <span className="sidebar-profile-gear">⚙</span>
            </div>
            <div className="sidebar-profile-role">Principal · viewing as {roleLabel}</div>
          </div>
        </div>

        <div className="sidebar-status">
          <div className="sidebar-agent">
            <span className="sidebar-agent-dot" />
            <span>Agent · active</span>
          </div>
          <div className="sidebar-chips">
            <span className="sidebar-chip" title="Shortcuts">?</span>
            <span className="sidebar-chip" title="Command palette">⌘K</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
