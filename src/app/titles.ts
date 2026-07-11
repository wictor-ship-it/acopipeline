/* Page-title lookup for the top bar (README §5). */

const TITLES: Record<string, string> = {
  "/welcome": "Welcome",
  "/intelligence": "Intelligence",
  "/contacts": "Contacts",
  "/opportunities": "Opportunities",
  "/inbox": "Inbox",
  "/marketing": "Marketing",
  "/reports": "Reports",
  "/settings": "Settings",
  "/activities": "Activities",
  "/partner/dashboard": "Dashboard",
  "/partner/pipeline": "Pipeline",
  "/partner/new-referral": "New Referral",
  "/partner/collaterals": "Collaterals",
};

export function titleForPath(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  // longest known prefix (record detail routes come in later steps)
  const hit = Object.keys(TITLES)
    .filter((p) => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? TITLES[hit] : "A/CO";
}

/** The top bar is hidden on the Inbox (README §5) and on record screens,
 *  which carry their own breadcrumb action bar (README §6). */
export function topbarHidden(pathname: string): boolean {
  return (
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/deal/") ||
    pathname.startsWith("/dealpage/") ||
    pathname.startsWith("/contact/")
  );
}
