/* Agent provider — single swap point. Phase 2 replaces the mock with the
   real Claude-API service here; nothing else in the app changes. */
import type { AgentService } from "../domain/agent";
import { MockAgentService } from "./mockAgentService";

let instance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!instance) instance = new MockAgentService();
  return instance;
}

export type { AgentItem, AgentService, AgentSkill, ResolvedAgentItem } from "../domain/agent";
export { SKILL_LABELS } from "../domain/agent";
