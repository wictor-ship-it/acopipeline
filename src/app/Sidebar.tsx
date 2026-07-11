import { NavLink, useNavigate } from "react-router-dom";
import { useAppState } from "./state";
import { ROLES, navForRole, homePathForRole, type Role } from "./roles";
import "./Sidebar.css";

export function Sidebar() {
  const { viewAs, setViewAs, signOut, inboxUnread } = useAppState();
  const navigate = useNavigate();
  const items = navForRole(viewAs);

  function onRoleChange(role: Role) {
    setViewAs(role);
    navigate(homePathForRole(role));
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo">A/CO</div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <span>{item.label}</span>
            {item.badge === "inbox-unread" && inboxUnread > 0 && (
              <span className="nav-badge">{inboxUnread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="viewas">
        <div className="viewas-label">View as</div>
        <select
          className="viewas-select"
          value={viewAs}
          onChange={(e) => onRoleChange(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button type="button" className="sidebar-signout" onClick={signOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
