/* =========================================================================
   Domain model — README §8 (mínimo Fase 1).
   Every entity is persisted through the repository layer; every mutation
   must produce an AuditEntry (Law 2) and be undoable (Law 3).
   ========================================================================= */

export type ContactCategory =
  | "client"
  | "prospect"
  | "sphere"
  | "partner"
  | "vendor";

export type ContactStatus = "hot" | "warm" | "nurturing" | "won" | "lost";

export type Language = "PT" | "EN" | "ES";

export interface Contact {
  id: string;
  name: string;
  category: ContactCategory;
  status: ContactStatus;
  phone?: string;
  email?: string;
  language: Language[];
  spouse?: string;
  company?: string;
  title?: string;
  linkedin?: string;
  birthday?: string;
  preferences?: Record<string, unknown>;
  pinned?: Record<string, unknown>;
  source?: string;
  referral_of?: string;
  since?: string;

  /* --- Display fields carried by the v5 prototype rows (§8 is a minimum;
         these keep the directory/detail screens pixel-faithful) --- */
  relationship?: string; // e.g. "Client · Buyer"
  location?: string; // e.g. "São Paulo, BR"
  /** raw directory badge as shown in v5 (HOT/WARM/PAST/SPHERE/VENDOR/…) */
  directory_status?: string;
  tags?: string[];
  lifetime_gci?: string;
  deals_won?: string;
  active_deals?: string;
  last_touch?: string;
  narrative?: string;
  agent_note?: string;
}

export interface Mandate {
  id: string;
  contact_id: string;
  text: string;
  active: boolean;
  updated_at: string;
}

export type Pipeline =
  | "purchases"
  | "listings"
  | "rentals"
  | "investments"
  | "offmarket";

export interface Opportunity {
  id: string;
  /** empty string when the card has no directory contact (v5 synthesizes) */
  contact_id: string;
  pipeline: Pipeline;
  stage: string;
  budget?: string;
  probability?: number;
  next_action?: string;
  next_due?: string;
  search_criteria?: Record<string, unknown>;
  heat?: string;

  /* v5 display fields */
  name?: string; // e.g. "Rivage PH-A · Marcelo C."
  contact_name?: string;
  card_label?: string; // e.g. "Buyer · Pre-construction"
  gci?: string;
  prob_suggested?: number;
  language?: Language;
  trend?: string; // "Strong ↑" / "Steady →" / "At risk ↓"
  division?: string;
  source?: string;
  tags?: string[];
  narrative?: string;
  overdue?: boolean;
}

export interface Transaction {
  id: string;
  opportunity_id: string;
  status: string;
  milestones: Milestone[];
  close_date?: string;
  gci?: string;

  /* v5 display fields */
  property?: string; // e.g. "Sterling — Acqualina 4802"
  client?: string;
  deal_type?: string; // "Purchase" / "Listing"
  meta?: string; // e.g. "Under Contract · Cash · Effective Jun 24"
  milestones_label?: string; // e.g. "2 of 9 milestones"
  pct?: string;
  status_color?: string;
  budget?: string;
  probability?: number;
  next_peek?: string;
}

export interface Milestone {
  label: string;
  due?: string;
  done?: boolean;
}

export type ActivityType =
  | "call"
  | "whatsapp"
  | "email"
  | "showing"
  | "note"
  | "task";

export type ActivityOutcome = "advanced" | "neutral" | "cooled";

export interface Activity {
  id: string;
  contact_id?: string;
  opportunity_id?: string;
  type: ActivityType;
  body: string;
  outcome?: ActivityOutcome;
  due?: string;
  done?: boolean;
  source?: string;
  /* v5 display fields */
  date?: string; // e.g. "Jul 04"
  label?: string; // e.g. "Marcelo C. · Rivage PH-A"
  by_agent?: boolean;
}

/** §8 lists whatsapp|email; the v5 Inbox also carries one SMS thread. */
export type Channel = "whatsapp" | "email" | "sms";

export interface Thread {
  id: string;
  contact_id: string;
  channel: Channel;
  unread: boolean;
  /* v5 display fields */
  unread_count?: number;
  subject?: string; // e.g. "Rivage PH-A"
  initials?: string;
  last_time?: string; // e.g. "09:12" / "Jul 05"
}

export interface Message {
  id: string;
  thread_id: string;
  dir: "in" | "out";
  body: string;
  status?: string;
  at: string;
}

export type DraftStatus = "pending" | "approved" | "edited" | "skipped";

export interface Draft {
  id: string;
  target: { kind: "contact" | "deal"; id: string };
  channel: Channel;
  body: string;
  language: Language;
  status: DraftStatus;
  /* v5 display fields (Touch Today queue) */
  name_label?: string; // e.g. "Anton Keller · Zurich FO"
  value_label?: string; // e.g. "$412K wGCI"
  subject?: string; // e.g. "2nd visit + developer schedule"
  plan?: string; // e.g. "Confirm Saturday 11am · attach construction timeline"
}

export interface DocumentRef {
  id: string;
  entity: { kind: "contact" | "deal" | "referral"; id: string };
  drive_ref: string;
  name: string;
  type: string;
  size: string;
  uploaded_by: string;
  at: string;
}

export interface Referral {
  id: string;
  partner_id: string;
  client: string;
  stage: string;
  fee_pct?: number;
  agreement_status?: string;
  payout_status?: string;
}

/* --- Audit log (Law 2 — insert-only, never update/delete) --- */

export type Actor = "agent" | "user";

export interface AuditEntry {
  id: string;
  actor: Actor;
  /** agent skill that acted, when actor === "agent" (README §12) */
  skill?: string;
  action: string;
  entity: string;
  before: unknown;
  after: unknown;
  created_at: string;
}

/* --- Settings (autonomy matrix read from here at runtime — §12) --- */

export interface Settings {
  cadences: Record<string, unknown>;
  contact_types: string[];
  autonomy_rules: Record<string, unknown>;
  team: Record<string, unknown>[];
}

/* --- Private vault — Principal only; agent output must never use it --- */

export interface VaultEntry {
  contact_id: string;
  fields: Record<string, unknown>;
}
