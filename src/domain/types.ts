/* =========================================================================
   Domain model — README §8 (mínimo Fase 1).
   Every mutation must produce an AuditEntry (Law 2) and be undoable (Law 3).
   Extra display fields (carried by the v5 prototype) are marked as such.
   ========================================================================= */

export type ContactCategory = "client" | "prospect" | "sphere" | "partner" | "vendor";
/* v5 display statuses (copied literally from the prototype directory rows). */
export type ContactStatus =
  | "HOT" | "WARM" | "SPHERE" | "PAST" | "VENDOR" | "SLIPPING" | "PARTNER" | "YOU OWE";
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
  /* v5 display fields */
  dot?: string;
  relationship?: string;
  location?: string;
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

export type Pipeline = "purchases" | "listings" | "rentals" | "investments" | "offmarket";

export interface Opportunity {
  id: string;
  contact_id: string;
  pipeline: Pipeline;
  stage: string;
  budget?: string;
  probability?: number;
  next_action?: string;
  next_due?: string;
  search_criteria?: Record<string, unknown>;
  heat?: string;
  /* Why a deal was lost (set when status → Lost). */
  lost_reason?: string;
  /* v5 display fields */
  name?: string;
  contact_name?: string;
  card_label?: string;
  gci?: string;
  prob_suggested?: number;
  language?: Language;
  trend?: string;
  division?: string;
  source?: string;
  tags?: string[];
  narrative?: string;
  overdue?: boolean;
}

export interface Milestone { label: string; due?: string; done?: boolean; }

export interface Transaction {
  id: string;
  opportunity_id: string;
  status: string;
  milestones: Milestone[];
  close_date?: string;
  gci?: string;
  /* v5 display fields */
  property?: string;
  client?: string;
  deal_type?: string;
  meta?: string;
  milestones_label?: string;
  pct?: string;
  status_color?: string;
  budget?: string;
  probability?: number;
  next_peek?: string;
}

export type ActivityType = "call" | "whatsapp" | "email" | "showing" | "note" | "task";
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
  date?: string;
  label?: string;
  by_agent?: boolean;
}

/* §8 lists whatsapp|email; the v5 Inbox also carries one SMS thread. */
export type Channel = "whatsapp" | "email" | "sms";

export interface Thread {
  id: string;
  contact_id: string;
  channel: Channel;
  unread: boolean;
  unread_count?: number;
  subject?: string;
  initials?: string;
  last_time?: string;
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
  /* v5 display fields (Touch Today) */
  name_label?: string;
  value_label?: string;
  subject?: string;
  plan?: string;
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

/* --- Audit log (Law 2 — insert-only) --- */
export type Actor = "agent" | "user";
export interface AuditEntry {
  id: string;
  actor: Actor;
  skill?: string;
  action: string;
  entity: string;
  before: unknown;
  after: unknown;
  created_at: string;
}

export interface Settings {
  id: string;
  profile: Record<string, unknown>;
  cadences: Record<string, unknown>;
  contact_types: string[];
  autonomy_rules: Record<string, unknown>;
  team: Record<string, unknown>[];
  /* Cadence + action plan per status — the single cadence store. Canonical
     statuses are keyed by their name (read at runtime by Contact Detail; absent
     ⇒ defaults from STATUS_PLAY). Custom cadences use a synthetic key and carry
     their own display `name`. */
  status_cadence?: Record<string, { name?: string; cadence: string; action: string }>;
  /* Customizable "lost reason" options for deals (Settings · Pipeline & Stages). */
  loss_reasons?: string[];
}

export interface VaultEntry { id: string; contact_id: string; fields: Record<string, unknown>; }
