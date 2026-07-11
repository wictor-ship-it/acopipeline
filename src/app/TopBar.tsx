import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { titleForPath } from "./titles";
import { NOTIFICATIONS, TODAY_LABEL } from "./chrome-content";

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

/** Record-screen breadcrumb + actions. */
function isContactRecord(p: string) { return p.startsWith("/contact/"); }
function isDealRecord(p: string) { return p.startsWith("/deal/") || p.startsWith("/dealpage/"); }
function isRecord(p: string) { return isContactRecord(p) || isDealRecord(p); }

function breadcrumb(p: string): { arrow: string; title: string } | null {
  if (isContactRecord(p)) return { arrow: "‹ ", title: "Contact" };
  if (p.startsWith("/dealpage/")) return { arrow: "‹ ", title: "Deal Record" };
  if (p.startsWith("/deal/")) return { arrow: "‹ ", title: "Deal Detail" };
  return null;
}

export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [read, setRead] = useState(false);

  // Inbox is a full-bleed two-pane surface — no top bar (README §5, v5).
  if (pathname.startsWith("/inbox")) return null;

  const bc = breadcrumb(pathname);
  const title = bc ? bc.title : titleForPath(pathname);
  const unread = read ? 0 : NOTIFICATIONS.length;

  const isWelcome = pathname.startsWith("/welcome");

  return (
    <header className="tb">
      <div className="tb-left">
        <h1 className="tb-title">
          {bc && <span className="arrow" onClick={() => navigate(-1)}>{bc.arrow}</span>}
          {title}
        </h1>
        <span className="tb-date">{TODAY_LABEL}</span>
      </div>

      <div className="tb-right">
        {isContactRecord(pathname) && (
          <>
            <button className="tb-action">Brief me</button>
            <div className="tb-menu-wrap">
              <button className="tb-action" onClick={() => setLogOpen((o) => !o)}>Log touch ▾</button>
              {logOpen && (
                <div className="tb-menu" onMouseLeave={() => setLogOpen(false)}>
                  {["Call", "WhatsApp", "Email", "Showing", "Note", "Task"].map((t) => (
                    <div key={t} className="tb-menu-item" onClick={() => { setLogOpen(false); navigate("/activities"); }}>{t}</div>
                  ))}
                </div>
              )}
            </div>
            <button className="tb-action" onClick={() => navigate("/opportunities")}>New Deal</button>
          </>
        )}
        {isWelcome && <button className="tb-action" onClick={() => navigate("/intelligence")}>Day brief ↗</button>}

        <div style={{ position: "relative" }}>
          <div className="tb-bell" title="Notifications" onClick={() => setNotifOpen((o) => !o)}>
            <BellIcon />
            {unread > 0 && <span className="tb-bell-badge">{unread}</span>}
          </div>
          {notifOpen && (
            <>
              <div className="tb-notif-scrim" onClick={() => setNotifOpen(false)} />
              <div className="tb-notif">
                <div className="tb-notif-head">
                  <span className="tb-notif-title">Notifications</span>
                  {unread > 0 ? (
                    <span className="tb-notif-clear" onClick={() => setRead(true)}>Mark all read</span>
                  ) : (
                    <span className="tb-notif-clear" style={{ color: "var(--accent)" }}>All clear</span>
                  )}
                </div>
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className={`tb-notif-row${read ? " read" : ""}`} onClick={() => { setNotifOpen(false); if (n.to) navigate(n.to); }}>
                    <span className="tb-notif-dot" style={{ background: n.dot }} />
                    <div>
                      <div className="tb-notif-text">{n.text}</div>
                      <div className="tb-notif-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export { isRecord };
