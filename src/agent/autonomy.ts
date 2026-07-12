/* Autonomy resolution — README §12 / System Core "Matriz de autonomia".
   Read from Settings §03 at RUNTIME, never hard-coded. Shared by the mock and
   the real Claude-backed service so both stamp items identically. */
import type { AgentItem, AutonomyMode } from "../domain/agent";

/** Which Settings §03 toggle governs each item type. Anything that sends to a
    client or changes a client-visible record needs approval by default. */
export function resolveAutonomy(item: AgentItem, autonomy: Record<string, { autonomous?: boolean }>): AutonomyMode {
  const on = (key: string) => !!autonomy[key]?.autonomous;
  switch (item.type) {
    case "draft_pair":       return on("send") ? "autonomous" : "ask_first";
    case "learned_field":    return on("hygiene") ? "autonomous" : "ask_first";
    case "milestone_alert":  return on("chase") ? "autonomous" : "ask_first";
    case "compliance_block": return "ask_first";  // Compliance blocks — never auto-resolved
    case "brief":            return on("capture") ? "autonomous" : "ask_first";
    default:                 return "ask_first";
  }
}
