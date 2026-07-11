/* =========================================================================
   MockAgentService — Phase 1 brain stub (README §12 "Implicação Fase 1").
   Produces items typed by skill from the persisted seed, and resolves each
   item's autonomy from Settings §03 at call time (never hard-coded). The real
   Claude-API service replaces this class in Phase 2 behind the same interface.
   ========================================================================= */
import type { AgentItem, AgentService, AgentSkill, AutonomyMode, ResolvedAgentItem } from "../domain/agent";
import type { Contact, Draft, Settings, Transaction } from "../domain/types";
import { getAll, getById } from "../data/repository";
import { violatesVoice } from "./voice";

/* Which Settings §03 toggle governs each item type. Approval is required for
   anything that sends to a client or changes a record the client sees. */
function resolveAutonomy(item: AgentItem, autonomy: Record<string, { autonomous?: boolean }>): AutonomyMode {
  const on = (key: string) => !!autonomy[key]?.autonomous;
  switch (item.type) {
    case "draft_pair":      return on("send") ? "autonomous" : "ask_first";   // any client send needs approval by default
    case "learned_field":   return on("hygiene") ? "autonomous" : "ask_first";
    case "milestone_alert": return on("chase") ? "autonomous" : "ask_first";  // vendor chase can be autonomous
    case "compliance_block": return "ask_first";                              // Compliance blocks — never auto-resolved
    case "brief":           return on("capture") ? "autonomous" : "ask_first";
    default:                return "ask_first";
  }
}

export class MockAgentService implements AgentService {
  async listItems(): Promise<ResolvedAgentItem[]> {
    const [settings, drafts, contacts, transactions] = await Promise.all([
      getById<Settings>("settings", "settings"),
      getAll<Draft>("drafts"),
      getAll<Contact>("contacts"),
      getAll<Transaction>("transactions"),
    ]);
    const autonomy = (settings?.autonomy_rules ?? {}) as Record<string, { autonomous?: boolean }>;
    const byId = new Map(contacts.map((c) => [c.id, c]));

    const items: AgentItem[] = [];

    /* 02 Chief of Staff — Touch Today brief line + each seeded draft as a
       Senior Advisor draft-pair. */
    items.push({
      id: "cos_brief", skill: "chief_of_staff", type: "brief",
      title: "Touch Today", conviction: "high",
      context: `${drafts.length} relationships due · 3 HOT in decision window · 1 referral ask overdue`,
    });

    /* 03 Senior Advisor — soft/direct draft pairs from the seeded touch queue. */
    for (const d of drafts) {
      const c = d.target.kind === "contact" ? byId.get(d.target.id) : undefined;
      const soft = d.body;
      const direct = toDirect(d.body, d.language);
      items.push({
        id: `sa_${d.id}`, skill: "senior_advisor", type: "draft_pair",
        title: d.name_label ?? c?.name ?? "Draft", conviction: "high",
        context: d.plan ?? d.subject ?? "Draft prepared — awaiting approval",
        target: d.target.kind === "contact" ? { kind: "contact", id: d.target.id } : { kind: "deal", id: d.target.id },
        language: d.language,
        draft: { soft, direct, channel: d.channel },
      });
    }

    /* 04 Transaction Coordinator — T-3 milestone alerts from transactions at risk. */
    for (const t of transactions.filter((x) => x.status_color === "#D0342C")) {
      items.push({
        id: `tc_${t.id}`, skill: "transaction_coordinator", type: "milestone_alert",
        title: t.property ?? "Transaction", conviction: "high",
        context: `${t.next_peek} · ${t.milestones_label}`,
        target: { kind: "deal", id: t.opportunity_id },
        milestone: { deal: t.property ?? "", label: t.next_peek ?? "", due: t.close_date ?? "", tMinus: "T-3", risk: true },
      });
    }

    /* 04 · data hygiene — a learned field with source + confidence (from the
       Marcelo thread: WhatsApp-only preference). */
    items.push({
      id: "tc_learn_marcelo", skill: "transaction_coordinator", type: "learned_field",
      title: "Marcelo Carvalho", conviction: "medium", inference: true,
      context: "Inferred from A. Bittencourt note + thread — proposes a field update",
      target: { kind: "contact", id: "marcelo" },
      learned: { entity: "marcelo", field: "channel_preference", value: "WhatsApp only", source: "Thread · A. Bittencourt Jul 04", confidence: "0.86" },
    });

    /* 05 Compliance — blocks a send pending a regulatory clock (routes to
       Needs Your Decision). Compliance can block any skill. */
    items.push({
      id: "cmp_block_sterling", skill: "compliance", type: "compliance_block",
      title: "Acqualina 4802 — hold on send", conviction: "high", needsDecision: true,
      context: "HOA package overdue · inspection window closes Jul 08 — client send held until cleared",
      target: { kind: "deal", id: "opp_sterling" },
      block: { blockedSkill: "senior_advisor", action: "send client update", reason: "HOA milestone overdue (T-3 breach)" },
    });

    /* Dev-only voice guard: no agent draft may carry forbidden voice. */
    if (import.meta.env?.DEV) {
      for (const it of items) {
        const texts = [it.draft?.soft, it.draft?.direct].filter(Boolean) as string[];
        for (const tx of texts) {
          const v = violatesVoice(tx);
          if (v.length) console.warn("[agent voice]", it.id, v);
        }
      }
    }

    return items.map((it) => ({ ...it, autonomy: resolveAutonomy(it, autonomy) }));
  }

  async listItemsBySkill(skill: AgentSkill): Promise<ResolvedAgentItem[]> {
    return (await this.listItems()).filter((i) => i.skill === skill);
  }
}

/* Produce the "direct" half of the pair — shorter, no hedging. The prototype
   ships one voice per draft; the mock derives a terser variant so the soft/
   direct affordance (§12 Senior Advisor) is real in the queue. */
function toDirect(soft: string, language: "PT" | "EN" | "ES"): string {
  const trimmed = soft.replace(/^["“]|["”]$/g, "");
  const firstSentence = trimmed.split(/(?<=[.?!])\s/)[0] ?? trimmed;
  const prefix = language === "PT" ? "Direto: " : language === "ES" ? "Directo: " : "Direct: ";
  return `"${prefix}${firstSentence}"`;
}
