/* =========================================================================
   AgentService contract — README §12. One agent, four skills over a System
   Core. Phase 1 is a mock behind this interface; Phase 2+ swaps in the real
   Claude-API brain with no change to the queues that consume these items.

   The mock produces items typed by skill (brief · draft-pair · milestone-alert
   · learned-field · compliance-block) and reads the autonomy matrix from
   Settings §03 at RUNTIME — never hard-coded.
   ========================================================================= */
import type { Channel, Language } from "./types";

/* 01 System Core is always loaded; it routes to one of the four skills. */
export type AgentSkill =
  | "chief_of_staff"          // 02 · the day
  | "senior_advisor"          // 03 · the relationship
  | "transaction_coordinator" // 04 · the contract
  | "compliance";             // 05 · transversal, runs before any action

export type AgentItemType =
  | "brief"             // Chief of Staff — morning brief / Touch Today line
  | "draft_pair"        // Senior Advisor — soft/direct pair in the Principal's voice
  | "milestone_alert"   // Transaction Coordinator — T-3 milestone
  | "learned_field"     // data hygiene — a field the agent learned, with source+confidence
  | "compliance_block"; // Compliance — blocks an action of another skill

export type Conviction = "high" | "medium" | "low";

/* Resolved per item from Settings §03 at runtime — not stored on the item. */
export type AutonomyMode = "autonomous" | "ask_first";

export interface AgentTarget { kind: "contact" | "deal" | "referral"; id: string; }

export interface AgentItem {
  id: string;
  skill: AgentSkill;
  type: AgentItemType;
  title: string;
  /* Every assertion references a record or is marked as inference (§12 voice). */
  context: string;
  inference?: boolean;
  conviction: Conviction;
  target?: AgentTarget;
  language?: Language;
  /* Doubt routes the item to the *Needs Your Decision* queue (§12 routing). */
  needsDecision?: boolean;

  /* draft_pair */
  draft?: { soft: string; direct: string; channel: Channel };
  /* milestone_alert */
  milestone?: { deal: string; label: string; due: string; tMinus: string; risk: boolean };
  /* learned_field */
  learned?: { entity: string; field: string; value: string; source: string; confidence: string };
  /* compliance_block */
  block?: { blockedSkill: AgentSkill; action: string; reason: string };
}

/* An item stamped with the autonomy mode resolved from current Settings. */
export interface ResolvedAgentItem extends AgentItem { autonomy: AutonomyMode; }

export interface AgentService {
  /** All pending agent items, autonomy resolved from Settings §03 at call time. */
  listItems(): Promise<ResolvedAgentItem[]>;
  /** Items for a single skill lane. */
  listItemsBySkill(skill: AgentSkill): Promise<ResolvedAgentItem[]>;
}

export const SKILL_LABELS: Record<AgentSkill, string> = {
  chief_of_staff: "Chief of Staff",
  senior_advisor: "Senior Advisor",
  transaction_coordinator: "Transaction Coordinator",
  compliance: "Compliance",
};
