/* =========================================================================
   Roles & navigation model (README §5)
   "View as" filters the nav. Referral Partner swaps to the partner portal nav.
   ========================================================================= */

export type Role =
  | "sales-agent"
  | "admin"
  | "transaction-coordinator"
  | "marketing"
  | "referral-partner";

export interface RoleDef {
  id: Role;
  label: string;
}

export const ROLES: RoleDef[] = [
  { id: "sales-agent", label: "Sales Agent" },
  { id: "admin", label: "Admin" },
  { id: "transaction-coordinator", label: "Transaction Coordinator" },
  { id: "marketing", label: "Marketing" },
  { id: "referral-partner", label: "Referral Partner" },
];

export interface NavItem {
  /** route path (relative to app root) */
  path: string;
  label: string;
  /** show an unread badge (Inbox only, README §5) */
  badge?: "inbox-unread";
}

/** Full internal nav — README §5. Activities is intentionally NOT here. */
const INTERNAL_NAV: NavItem[] = [
  { path: "/welcome", label: "Welcome" },
  { path: "/intelligence", label: "Intelligence" },
  { path: "/contacts", label: "Contacts" },
  { path: "/opportunities", label: "Opportunities" },
  { path: "/inbox", label: "Inbox", badge: "inbox-unread" },
  { path: "/marketing", label: "Marketing" },
  { path: "/reports", label: "Reports" },
  { path: "/settings", label: "Settings" },
];

/** Referral Partner nav — README §5: Dashboard · Pipeline · New Referral · Collaterals */
const PARTNER_NAV: NavItem[] = [
  { path: "/partner/dashboard", label: "Dashboard" },
  { path: "/partner/pipeline", label: "Pipeline" },
  { path: "/partner/new-referral", label: "New Referral" },
  { path: "/partner/collaterals", label: "Collaterals" },
];

/** Transaction Coordinator sees the contract-centric Transactions screen
 *  (README §6 `tc`), reached by view-as per §5's "view as filters the nav". */
const TC_NAV: NavItem[] = [
  { path: "/welcome", label: "Welcome" },
  { path: "/intelligence", label: "Intelligence" },
  { path: "/transactions", label: "Transactions" },
  { path: "/contacts", label: "Contacts" },
  { path: "/opportunities", label: "Opportunities" },
  { path: "/inbox", label: "Inbox", badge: "inbox-unread" },
  { path: "/settings", label: "Settings" },
];

/**
 * Nav per role. README §5 specifies the standard 8-item internal nav and the
 * Referral Partner swap; the Transaction Coordinator surfaces Transactions.
 */
export function navForRole(role: Role): NavItem[] {
  if (role === "referral-partner") return PARTNER_NAV;
  if (role === "transaction-coordinator") return TC_NAV;
  return INTERNAL_NAV;
}

export function homePathForRole(role: Role): string {
  return role === "referral-partner" ? "/partner/dashboard" : "/welcome";
}
