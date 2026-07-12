import { bffFetch } from "./bffClient";
import type { AgentItem } from "../../domain/agent";

/* Agent brain via the BFF (Claude API, server-side key). Returns null when the
   brain is unreachable or unconfigured → the ClaudeAgentService falls back to
   the mock. Status is memoized so a down/absent brain isn't re-probed per call. */

export interface AgentStatus { configured: boolean; model: string | null }

let statusCache: AgentStatus | null | undefined; // undefined = not probed, null = unreachable

export async function getAgentStatus(force = false): Promise<AgentStatus | null> {
  if (!force && statusCache !== undefined) return statusCache;
  try {
    statusCache = await bffFetch<AgentStatus>("/api/agent/status");
  } catch {
    statusCache = null;
  }
  return statusCache;
}

/** POST the canonical records; get typed items back. null ⇒ fall back to mock. */
export async function fetchAgentItems(context: unknown, skill?: string): Promise<AgentItem[] | null> {
  const status = await getAgentStatus();
  if (!status || !status.configured) return null; // brain down or no key → mock
  try {
    const data = await bffFetch<{ items: AgentItem[] }>("/api/agent/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, context }),
    });
    return data.items;
  } catch {
    return null;
  }
}
