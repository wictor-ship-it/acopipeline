/* =========================================================================
   MockAgentService — Fase 1 stub. Items come from seed fixtures and flow
   through the REAL queues; resolutions persist through the repository so
   Laws 1–3 hold exactly as they will with the real agent.
   ========================================================================= */

import content from "../data/seed/content.json";
import type { Draft } from "../domain/types";
import { getAll, getById, save } from "../data/repository";
import type {
  AgentItem,
  AgentService,
  AutonomyMatrix,
  DecisionItem,
  LearnedFieldItem,
} from "./AgentService";

const NOW = () => new Date().toISOString();

export class MockAgentService implements AgentService {
  async getQueue(
    queue: "touch-today" | "needs-decision" | "learned",
  ): Promise<AgentItem[]> {
    if (queue === "needs-decision") {
      return content.intelligence.needsYourDecision.map(
        (d): DecisionItem => ({
          id: `dec_${d.id}`,
          skill: "chief-of-staff",
          created_at: NOW(),
          kind: "decision",
          label: d.label,
          body: d.body,
          why: d.why,
        }),
      );
    }
    if (queue === "learned") {
      return content.intelligence.agentLearned.map(
        (l): LearnedFieldItem => ({
          id: `learn_${l.id}`,
          skill: "senior-advisor",
          created_at: NOW(),
          kind: "learned-field",
          source: l.src,
          text: l.text,
          save_label: l.saveLabel,
          audit_line: l.audit,
        }),
      );
    }
    // touch-today: surface pending drafts as draft items (see getPendingDrafts)
    return [];
  }

  async getPendingDrafts(): Promise<Draft[]> {
    const all = await getAll<Draft>("drafts");
    return all.filter((d) => d.status === "pending");
  }

  async getAutonomy(): Promise<AutonomyMatrix> {
    // Runtime read from Settings §03 — never hard-coded (README §12).
    const rules = await getById<{
      id: string;
      autonomous: string[];
      approval_required: string[];
    }>("settings", "autonomy_rules");
    return {
      autonomous: rules?.autonomous ?? [],
      approval_required: rules?.approval_required ?? [],
    };
  }

  async resolve(
    itemId: string,
    outcome: "approved" | "edited" | "skipped",
    editedBody?: string,
  ): Promise<void> {
    // Draft resolutions persist; audit + undo come free via the repository.
    const draft = await getById<Draft>("drafts", itemId);
    if (draft) {
      const next: Draft = {
        ...draft,
        status: outcome,
        body: outcome === "edited" && editedBody ? editedBody : draft.body,
      };
      await save("drafts", next, {
        actor: "user",
        skill: "senior-advisor",
        action:
          outcome === "approved"
            ? `Draft approved & sent (mock) — ${draft.name_label ?? draft.id}`
            : outcome === "edited"
              ? `Draft edited & sent (mock) — ${draft.name_label ?? draft.id}`
              : `Draft skipped — ${draft.name_label ?? draft.id}`,
      });
    }
  }

  async ask(text: string): Promise<{ reply: string }> {
    // Fase 1 canned reply — conviction signaled, no superlatives (§12 voice).
    void text;
    return {
      reply:
        "Pipeline health 82/100 — aging is the only factor on watch (2 stalled deals). Confidence: high.",
    };
  }
}

export const agentService: AgentService = new MockAgentService();
