import express from "express";
import cors from "cors";
import { agentConfigured, config, isConfigured, missingConfig } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { gmailRouter } from "./routes/gmail.js";
import { calendarRouter } from "./routes/calendar.js";
import { agentRouter } from "./routes/agent.js";

/* A/CO Pipeline Intelligence — thin BFF (Phase 2).
   SPA ⇄ this ⇄ Google. Secrets + refresh tokens live here, never in the browser.
   See design_handoff_fase1/phase2/01-google-gmail-calendar-setup.md */

const app = express();

app.use(cors({ origin: config.allowedOrigin, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, configured: isConfigured(), missing: missingConfig(), agent: agentConfigured() });
});

app.use("/auth", authRouter);
app.use("/api/gmail", gmailRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/agent", agentRouter);

app.listen(config.port, () => {
  console.log(`[bff] listening on http://localhost:${config.port} → SPA origin ${config.allowedOrigin}`);
  const missing = missingConfig();
  if (missing.length) {
    console.warn(`[bff] NOT configured yet — fill server/.env: ${missing.join(", ")}`);
    console.warn(`[bff] auth routes will 503 until then. See phase2 setup guide.`);
  } else {
    console.log(`[bff] google configured · scopes: ${config.scopes.join(" ")}`);
  }
  console.log(agentConfigured() ? `[bff] agent brain · Claude API · model ${config.anthropicModel}` : `[bff] agent brain · not configured (ANTHROPIC_API_KEY) — SPA uses mock agent`);
});
