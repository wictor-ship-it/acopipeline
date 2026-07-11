/* =========================================================================
   AgentService — the contract the real agent (Claude API, Fase 2+) will
   implement. Fase 1 ships a mock behind this exact interface (README §12).

   One agent, four skills over a System Core:
     chief-of-staff        · the day (brief, touch today, sequences, wrap)
     senior-advisor        · the relationship (draft pairs, dossiers, plays)
     transaction-coordinator · the contract (milestones, doc intake, chases)
     compliance            · transversal — runs BEFORE any action; can block

   Rules the interface must never let an implementation violate:
   - Autonomy matrix is READ FROM SETTINGS AT RUNTIME (never hard-coded).
   - Nothing is sent to a client without human approval (Law 1).
   - Every agent action logs to the Agent Ledger / audit_log (Law 2).
   - Doubt routes to the "Needs Your Decision" queue.
   - Agent output may never use the private vault.
   ========================================================================= */

import type { Draft, Language } from "../domain/types";

export type AgentSkill =
  | "chief-of-staff"
  | "senior-advisor"
  | "transaction-coordinator"
  | "compliance";

/** Skill-typed items the agent can put in front of the human. */
export type AgentItem =
  | BriefItem
  | DraftPairItem
  | MilestoneAlertItem
  | LearnedFieldItem
  | ComplianceBlockItem
  | DecisionItem;

interface BaseItem {
  id: string;
  skill: AgentSkill;
  created_at: string;
}

/** Morning brief / wrap (Chief of Staff). */
export interface BriefItem extends BaseItem {
  kind: "brief";
  title: string;
  line: string;
}

/** Message drafts in soft/direct pair, in the contact's language (Senior Advisor). */
export interface DraftPairItem extends BaseItem {
  kind: "draft-pair";
  contact_id: string;
  language: Language;
  soft: string;
  direct: string;
}

/** T-3 milestone alert (Transaction Coordinator). */
export interface MilestoneAlertItem extends BaseItem {
  kind: "milestone-alert";
  transaction_id: string;
  text: string;
  due: string;
}

/** Field learned from a conversation, with source + confidence. */
export interface LearnedFieldItem extends BaseItem {
  kind: "learned-field";
  source: string; // e.g. "Call · Marcelo — Jul 05"
  text: string;
  save_label: string;
  audit_line: string;
}

/** Compliance can block any skill's action. */
export interface ComplianceBlockItem extends BaseItem {
  kind: "compliance-block";
  rule: string;
  note: string;
}

/** Doubt → Needs Your Decision queue. */
export interface DecisionItem extends BaseItem {
  kind: "decision";
  label: string;
  body: string;
  why: string;
}

/** Autonomy matrix — always read from Settings §03 at runtime. */
export interface AutonomyMatrix {
  autonomous: string[];
  approval_required: string[];
}

export interface AgentService {
  /** Items pending human review, by queue. */
  getQueue(queue: "touch-today" | "needs-decision" | "learned"): Promise<AgentItem[]>;

  /** Pending message drafts (flow through the same approval queues). */
  getPendingDrafts(): Promise<Draft[]>;

  /** The current autonomy matrix, read from the settings store. */
  getAutonomy(): Promise<AutonomyMatrix>;

  /** Resolve a queue item: approve / edit / skip. Implementations must
   *  write the outcome to audit_log with the acting skill. */
  resolve(
    itemId: string,
    outcome: "approved" | "edited" | "skipped",
    editedBody?: string,
  ): Promise<void>;

  /** Free-form ask (chat). Mock answers from fixtures; real agent in Fase 2+. */
  ask(text: string): Promise<{ reply: string }>;
}
