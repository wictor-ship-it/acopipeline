import { Router } from "express";
import { config, isConfigured, missingConfig } from "../config.js";
import { authUrl, exchangeCode } from "../google.js";
import { randomId } from "../crypto.js";
import { saveTokens, clearTokens, getProfile } from "../tokenStore.js";
import { setSession, readSession, clearSession, setState, takeState } from "../session.js";

export const authRouter = Router();

/* GET /auth/google/start — begin OAuth. Sets a signed state cookie (CSRF) and
   redirects to Google's consent screen. */
authRouter.get("/google/start", (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "not_configured", missing: missingConfig() });
  const state = randomId();
  setState(res, state);
  res.redirect(authUrl(state));
});

/* GET /auth/google/callback — Google returns here with `code` + `state`.
   Verify state, exchange the code, store the (encrypted) refresh token under a
   fresh session id, set the session cookie, and bounce back to the SPA. */
authRouter.get("/google/callback", async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: "not_configured", missing: missingConfig() });
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const expected = takeState(req, res);
  if (!code || !state || !expected || state !== expected) {
    return res.status(400).send("OAuth state mismatch — please retry sign-in.");
  }
  try {
    const { refreshToken, profile } = await exchangeCode(code);
    if (!refreshToken) {
      // No refresh token ⇒ prior consent without offline access. Force re-consent.
      return res.redirect(`${config.allowedOrigin}/?auth=reconsent`);
    }
    const sid = randomId();
    saveTokens(sid, refreshToken, profile);
    setSession(res, sid);
    res.redirect(`${config.allowedOrigin}/?auth=ok`);
  } catch (err) {
    console.error("[auth] callback failed:", err);
    res.redirect(`${config.allowedOrigin}/?auth=error`);
  }
});

/* GET /auth/session — SPA polls this to learn if it's signed in. */
authRouter.get("/session", (req, res) => {
  const sid = readSession(req);
  const profile = sid ? getProfile(sid) : null;
  res.json({ authed: !!profile, email: profile?.email ?? null, name: profile?.name ?? null, configured: isConfigured() });
});

/* POST /auth/logout — drop the tokens + session cookie. */
authRouter.post("/logout", (req, res) => {
  const sid = readSession(req);
  if (sid) clearTokens(sid);
  clearSession(res);
  res.json({ ok: true });
});
