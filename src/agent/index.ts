/* Agent provider — single swap point. Phase 2: the ClaudeAgentService is the
   default. It calls the real Claude brain via the BFF and transparently falls
   back to the MockAgentService when the brain is unreachable or unconfigured,
   so nothing else in the app changes and the demo always works. */
import type { AgentService } from "../domain/agent";
import { ClaudeAgentService } from "./claudeAgentService";

let instance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!instance) instance = new ClaudeAgentService();
  return instance;
}

export type { AgentItem, AgentService, AgentSkill, ResolvedAgentItem } from "../domain/agent";
export { SKILL_LABELS } from "../domain/agent";
