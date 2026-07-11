/* Resolving an agent item runs through the SAME queue path as everything else:
   approve/edit/skip writes an insert-only audit_log row tagged with the skill
   (Law 2) and pushes an Undo (Law 3). Nothing is "sent" without this approval
   (Law 1). Screens (Step 4) call this from their queues. */
import { recordAction } from "../data/repository";
import type { ResolvedAgentItem } from "../domain/agent";
import { SKILL_LABELS } from "../domain/agent";

export type AgentDecision = "approved" | "edited" | "skipped";

export async function resolveAgentItem(
  item: ResolvedAgentItem,
  decision: AgentDecision,
  onRevert: () => void | Promise<void> = () => {},
): Promise<void> {
  const action = `${SKILL_LABELS[item.skill]} · ${decision} — ${item.title}`;
  await recordAction({ actor: "user", skill: item.skill, action }, item.target ? `${item.target.kind}/${item.target.id}` : item.id, onRevert);
}
