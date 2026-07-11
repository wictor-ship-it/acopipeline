/* Roles & nav model (README §5). View-as filters the nav; Referral Partner
   swaps to the partner portal nav. */

export type Role =
  | "sales-agent"
  | "admin"
  | "transaction-coordinator"
  | "marketing"
  | "referral-partner";

export interface RoleDef { id: Role; label: string; }

export const ROLES: RoleDef[] = [
  { id: "sales-agent", label: "Sales Agent" },
  { id: "admin", label: "Admin" },
  { id: "transaction-coordinator", label: "Transaction Coordinator" },
  { id: "marketing", label: "Marketing" },
  { id: "referral-partner", label: "Referral Partner" },
];

export interface NavItem { path: string; label: string; badge?: "inbox-unread"; }

/* Standard internal nav — README §5 (Activities is intentionally NOT here) */
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

/* Referral Partner — README §5: Dashboard · Pipeline · New Referral · Collaterals */
const PARTNER_NAV: NavItem[] = [
  { path: "/partner/dashboard", label: "Dashboard" },
  { path: "/partner/pipeline", label: "Pipeline" },
  { path: "/partner/new-referral", label: "New Referral" },
  { path: "/partner/collaterals", label: "Collaterals" },
];

export function navForRole(role: Role): NavItem[] {
  return role === "referral-partner" ? PARTNER_NAV : INTERNAL_NAV;
}

export function homePathForRole(role: Role): string {
  return role === "referral-partner" ? "/partner/dashboard" : "/welcome";
}
