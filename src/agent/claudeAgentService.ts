/* =========================================================================
   ClaudeAgentService — Phase 2 real brain behind the SAME AgentService
   interface. Sends the canonical records to the BFF (which calls Claude with
   the System Core + 4 skill prompts and a forced tool), then stamps each item's
   autonomy from Settings §03 at call time. If the brain is unreachable or
   unconfigured, it transparently falls back to the MockAgentService — so the
   app never hard-depends on the backend.
   ========================================================================= */
import type { AgentService, AgentSkill, ResolvedAgentItem } from "../domain/agent";
import type { Contact, Draft, Opportunity, Settings, Transaction } from "../domain/types";
import { getAll, getById } from "../data/repository";
import { fetchAgentItems } from "../data/adapters/agent";
import { resolveAutonomy } from "./autonomy";
import { MockAgentService } from "./mockAgentService";

/* Compact the persisted records into the context the agent reasons over. Keep
   it lean — only the fields the skills need. */
async function buildContext() {
  const [contacts, drafts, opportunities, transactions] = await Promise.all([
    getAll<Contact>("contacts"),
    getAll<Draft>("drafts"),
    getAll<Opportunity>("opportunities"),
    getAll<Transaction>("transactions"),
  ]);
  return {
    contacts: contacts.map((c) => ({ id: c.id, name: c.name, status: c.status, relationship: c.relationship, language: c.language, last_touch: c.last_touch, active_deals: c.active_deals, referral_of: c.referral_of, agent_note: c.agent_note })),
    drafts: drafts.map((d) => ({ id: d.id, target: d.target, name: d.name_label, subject: d.subject, plan: d.plan, body: d.body, channel: d.channel, language: d.language })),
    opportunities: opportunities.map((o) => ({ id: o.id, name: o.name, contact_id: o.contact_id, pipeline: o.pipeline, stage: o.stage, heat: o.heat, probability: o.probability, next_action: o.next_action, next_due: o.next_due })),
    transactions: transactions.map((t) => ({ id: t.id, opportunity_id: t.opportunity_id, property: t.property, next_peek: t.next_peek, milestones_label: t.milestones_label, close_date: t.close_date, at_risk: t.status_color === "#D0342C" })),
  };
}

export class ClaudeAgentService implements AgentService {
  private mock = new MockAgentService();

  async listItems(): Promise<ResolvedAgentItem[]> {
    const context = await buildContext();
    const items = await fetchAgentItems(context);
    if (items === null) return this.mock.listItems(); // brain down/unconfigured → mock

    const settings = await getById<Settings>("settings", "settings");
    const autonomy = (settings?.autonomy_rules ?? {}) as Record<string, { autonomous?: boolean }>;
    return items.map((it) => ({ ...it, autonomy: resolveAutonomy(it, autonomy) }));
  }

  async listItemsBySkill(skill: AgentSkill): Promise<ResolvedAgentItem[]> {
    return (await this.listItems()).filter((i) => i.skill === skill);
  }
}
