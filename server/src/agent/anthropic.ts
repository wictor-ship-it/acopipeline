import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { buildSystemPrompt, type SKILL_PROMPTS } from "./prompts.js";

/* Real agent brain. Calls Claude with the composed system prompt and a forced
   tool so the model returns strictly-typed AgentItems (same shape the SPA
   queues consume). The API key stays here, never in the browser. */

type Skill = keyof typeof SKILL_PROMPTS;

/* Tool schema mirrors src/domain/agent.ts AgentItem. Forcing this tool
   guarantees valid JSON — no free-text parsing. */
const EMIT_TOOL: Anthropic.Tool = {
  name: "emit_items",
  description: "Emit the agent's pending items for the Principal's approval queues.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            skill: { type: "string", enum: ["chief_of_staff", "senior_advisor", "transaction_coordinator", "compliance"] },
            type: { type: "string", enum: ["brief", "draft_pair", "milestone_alert", "learned_field", "compliance_block"] },
            title: { type: "string" },
            context: { type: "string", description: "Every assertion references a record or is marked as inference." },
            inference: { type: "boolean" },
            conviction: { type: "string", enum: ["high", "medium", "low"] },
            needsDecision: { type: "boolean" },
            target: {
              type: "object",
              properties: { kind: { type: "string", enum: ["contact", "deal", "referral"] }, id: { type: "string" } },
              required: ["kind", "id"],
            },
            language: { type: "string", enum: ["PT", "EN", "ES"] },
            draft: {
              type: "object",
              properties: { soft: { type: "string" }, direct: { type: "string" }, channel: { type: "string" } },
            },
            milestone: {
              type: "object",
              properties: { deal: { type: "string" }, label: { type: "string" }, due: { type: "string" }, tMinus: { type: "string" }, risk: { type: "boolean" } },
            },
            learned: {
              type: "object",
              properties: { entity: { type: "string" }, field: { type: "string" }, value: { type: "string" }, source: { type: "string" }, confidence: { type: "string" } },
            },
            block: {
              type: "object",
              properties: { blockedSkill: { type: "string" }, action: { type: "string" }, reason: { type: "string" } },
            },
          },
          required: ["id", "skill", "type", "title", "context", "conviction"],
        },
      },
    },
    required: ["items"],
  },
};

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: config.anthropicKey });
  return client;
}

export interface GenerateInput {
  skill?: Skill;
  /** Canonical records the SPA holds (contacts/deals/drafts/transactions), compacted. */
  context: unknown;
}

/** Ask Claude to produce the pending items over the given canonical context. */
export async function generateItems({ skill, context }: GenerateInput): Promise<unknown[]> {
  const system = buildSystemPrompt(skill);
  const userMsg =
    `Produza os itens pendentes para as filas de aprovação, com base APENAS nos registros canônicos abaixo. ` +
    `Ranqueie por urgência × valor. Não invente dados: toda afirmação referencia um registro ou é marcada como inferência (inference:true). ` +
    `Respeite a voz e o perímetro de autonomia. Emita via a ferramenta emit_items.\n\n` +
    `# Registros canônicos (JSON)\n${JSON.stringify(context)}`;

  const res = await anthropic().messages.create({
    model: config.anthropicModel,
    max_tokens: 4096,
    system,
    tools: [EMIT_TOOL],
    tool_choice: { type: "tool", name: "emit_items" },
    messages: [{ role: "user", content: userMsg }],
  });

  const toolUse = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return [];
  const input = toolUse.input as { items?: unknown[] };
  return Array.isArray(input.items) ? input.items : [];
}

/* --- Conversational agent (Contact Detail chat + universal command bar) --- */
export interface ChatInput {
  skill?: Skill;
  context: unknown;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  mode?: "relationship" | "command";
}

/** Free-form Claude reply grounded in the provided context. No side effects:
    anything client-facing is described as a proposal for the approval queue
    (Law 1), never executed here. */
export async function agentChat({ skill, context, messages, mode }: ChatInput): Promise<string> {
  const base = buildSystemPrompt(skill);
  const modeNote = mode === "command"
    ? "\n\nYou are the Principal's command bar over the CRM. Interpret the natural-language command and respond in ≤3 sentences. If it implies an outbound/client-facing action (message, email, calendar invite), DO NOT execute it — say precisely what you will queue in Needs Your Decision for approval (Law 1). For read/lookups, answer directly from the context. Reference records; mark anything not in the context as inference."
    : "\n\nYou are advising the Principal on THIS relationship, grounded in the record below. Be concise, specific and actionable. Never produce something that reaches the client without the Principal's approval — offer it as a draft/proposal.";
  const system = `${base}${modeNote}\n\n# Context (JSON)\n${JSON.stringify(context)}`;
  const res = await anthropic().messages.create({
    model: config.anthropicModel,
    max_tokens: 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || "…";
}
