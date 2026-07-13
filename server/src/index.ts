import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
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

/* Single-origin production (recommended): this same server also serves the
   built SPA, so there's one deploy, one origin, no CORS, and the SameSite=Lax
   session cookie just works. Enable with SERVE_SPA=true; point SPA_DIR at the
   built dist/ if it isn't at ../dist relative to the server's working dir.
   In dev this stays OFF (Vite serves the SPA on :5173). */
if (process.env.SERVE_SPA === "true") {
  // Anchor to this file's location (server/dist/index.js in prod, server/src in
  // dev) → repo/dist — works regardless of the process working directory.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const spaDir = process.env.SPA_DIR ? path.resolve(process.env.SPA_DIR) : path.resolve(here, "..", "..", "dist");
  if (fs.existsSync(path.join(spaDir, "index.html"))) {
    app.use(express.static(spaDir));
    // Client-side routing: any non-API GET falls back to index.html.
    app.get(/^(?!\/(?:api|auth|health)\b).*/, (_req, res) => res.sendFile(path.join(spaDir, "index.html")));
    console.log(`[bff] serving SPA (single-origin) from ${spaDir}`);
  } else {
    console.warn(`[bff] SERVE_SPA=true but no built SPA at ${spaDir} — run 'npm run build' at the repo root first (or set SPA_DIR)`);
  }
}

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
