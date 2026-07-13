import { Router } from "express";
import { agentConfigured, config } from "../config.js";
import { generateItems, agentChat } from "../agent/anthropic.js";

/* Agent brain routes. Gated on ANTHROPIC_API_KEY (independent of Google auth).
   The SPA posts its canonical records; Claude returns typed items. When no key
   is set the SPA transparently falls back to the mock agent. */

export const agentRouter = Router();

/* GET /api/agent/status — is the real brain live? */
agentRouter.get("/status", (_req, res) => {
  res.json({ configured: agentConfigured(), model: agentConfigured() ? config.anthropicModel : null });
});

/* POST /api/agent/items — body: { skill?, context } → { items } */
agentRouter.post("/items", async (req, res) => {
  if (!agentConfigured()) return res.status(503).json({ error: "agent_not_configured" });
  try {
    const skill = typeof req.body?.skill === "string" ? req.body.skill : undefined;
    const context = req.body?.context ?? {};
    const items = await generateItems({ skill, context });
    res.json({ items });
  } catch (err) {
    console.error("[agent] generate failed:", err);
    res.status(502).json({ error: "agent_upstream" });
  }
});

/* POST /api/agent/chat — body: { skill?, mode?, context, messages } → { reply } */
agentRouter.post("/chat", async (req, res) => {
  if (!agentConfigured()) return res.status(503).json({ error: "agent_not_configured" });
  try {
    const skill = typeof req.body?.skill === "string" ? req.body.skill : undefined;
    const mode = req.body?.mode === "command" ? "command" : "relationship";
    const context = req.body?.context ?? {};
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const reply = await agentChat({ skill, context, messages, mode });
    res.json({ reply });
  } catch (err) {
    console.error("[agent] chat failed:", err);
    const e = err as { status?: number; message?: string };
    res.status(502).json({ error: "agent_upstream", detail: String(e?.message ?? err).slice(0, 300), status: e?.status });
  }
});
