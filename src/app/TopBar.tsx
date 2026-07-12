import { useLocation, useNavigate } from "react-router-dom";

/* Top bar — literal from fragment 00 lines 864-925.
   padding 34px 48px 0; hidden on inbox; title 19px + date; right actions.
   Note: notification-center + contact actions get wired with their screens. */

const TITLES: Record<string, string> = {
  "/welcome": "Welcome",
  "/intelligence": "Intelligence",
  "/contacts": "Contacts",
  "/opportunities": "Opportunities",
  "/deal": "Deal Detail",
  "/marketing": "Marketing",
  "/reports": "Reports",
  "/settings": "Settings",
  "/transactions": "Transactions",
  "/activities": "Activities",
  "/partner/dashboard": "Dashboard",
  "/partner/pipeline": "Pipeline",
  "/partner/new-referral": "New Referral",
  "/partner/collaterals": "Collaterals",
};

function titleFor(p: string): string {
  if (TITLES[p]) return TITLES[p];
  const hit = Object.keys(TITLES).filter((k) => p.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return hit ? TITLES[hit] : "A/CO";
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Hidden on Inbox (topBarStyle = display:none; fragment/​logic line 394)
  if (pathname.startsWith("/inbox")) return null;

  const isCommand = pathname.startsWith("/welcome");

  return (
    <>
      <div className="tb">
        <div className="tb-left">
          <h1 className="tb-title">{titleFor(pathname)}</h1>
          <span className="tb-date">Monday, July 06 2026</span>
        </div>
        <div className="tb-right">
          {isCommand && <button className="tb-action" onClick={() => navigate("/intelligence")}>Day brief ↗</button>}
          <div className="tb-bell" title="Notifications"><BellIcon /></div>
        </div>
      </div>
      <div className="tb-divider" />
    </>
  );
}
