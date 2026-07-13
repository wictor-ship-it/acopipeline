# A/CO Pipeline Intelligence — Deploy & Handoff

How to run the app outside the dev server. Written against the actual codebase
(commit `ddca8f9`, first clean production build). Read this end-to-end before
deploying — the **session-cookie / same-domain** rule (§6) is the one thing that
silently breaks auth if you get it wrong.

---

## 1. What you're deploying

Two independently-hosted pieces:

| Piece | What it is | Build output | Runtime |
|---|---|---|---|
| **SPA** (`/`) | React + Vite single-page app | `dist/` — static HTML/CSS/JS | Any static host (CDN, nginx, Netlify, S3+CloudFront…) |
| **BFF** (`/server`) | Node + TypeScript (ESM) Express API | `server/dist/` | Any Node host (Render, Railway, Fly, a VM…) — long-running process |

**The BFF is the only thing that holds secrets** (Google OAuth client secret,
refresh tokens, the Anthropic key). The browser only ever gets an httpOnly
session cookie. Never put a secret in the SPA build.

**Where the CRM data lives (Phase 1):** in the browser, via **IndexedDB**
(`aco-pipeline-intelligence-v2`), seeded on first load. It is per-browser and
per-device — two people, or two browsers, do **not** share data, and clearing
site data resets to the seed. This is a deliberate Phase-1 characteristic; a
real multi-user deployment moves CRM persistence server-side (Phase 2+). The
BFF does **not** store CRM records — only OAuth tokens and the session map.

---

## 2. Prerequisites

- **Node 20+** on the BFF host.
- A **domain you control** (strongly recommended — see §6). Ideally one
  registrable domain with two subdomains, e.g. `app.arraes.com` (SPA) and
  `api.arraes.com` (BFF).
- **HTTPS on both** (required in production — the session cookie only sets its
  `Secure` flag when `ALLOWED_ORIGIN` is `https://…`, and Google OAuth requires
  https redirect URIs).
- (For Google) a Google Cloud OAuth Web client — see
  [`01-google-gmail-calendar-setup.md`](01-google-gmail-calendar-setup.md).
  Consent screen = **Internal** (arraes.com is Workspace), so no verification.
- (For the agent) an `ANTHROPIC_API_KEY` from console.anthropic.com. Optional —
  without it the app runs the mock agent.

> Note: the project path contains a colon (`A:CO Collaterals`), which breaks
> npm's PATH-based bin shims. The `package.json` scripts already invoke binaries
> by direct node path — don't "simplify" them to bare `tsc`/`vite`. On a clean
> deploy host without the colon in the path this is a non-issue.

---

## 3. Environment variables

### BFF — `server/.env` (all server-side; **never** exposed to the browser)

| Var | Required | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google only | From Google Cloud → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google only | Secret — server-side only |
| `GOOGLE_REDIRECT_URI` | Google only | **Public** BFF callback, e.g. `https://api.arraes.com/auth/google/callback`. Must also be registered in the Google Cloud OAuth client. |
| `OAUTH_SCOPES` | Google only | Read-only by default; add `gmail.send` / `calendar.events` for Stage 2b writes (and on the consent screen) |
| `SESSION_SECRET` | **yes** | Signs the session cookie. `openssl rand -base64 32` |
| `TOKEN_ENCRYPTION_KEY` | **yes** | AES-256-GCM key for tokens at rest. `openssl rand -base64 32` |
| `PORT` | no | Default `8787`. Many hosts inject their own `PORT` — the code reads it. |
| `ALLOWED_ORIGIN` | **yes** | The SPA's public origin, e.g. `https://app.arraes.com`. Drives CORS **and** the cookie `Secure` flag — must be `https://…` in prod. |
| `ANTHROPIC_API_KEY` | agent only | Lights up the real Claude agent; absent ⇒ mock |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-5` (default) or `claude-opus-4-8` |

Generate the two secrets once:
```bash
openssl rand -base64 32   # → SESSION_SECRET
openssl rand -base64 32   # → TOKEN_ENCRYPTION_KEY
```

### SPA — `.env` (no secrets; inlined at **build time**)

| Var | Notes |
|---|---|
| `VITE_BFF_URL` | The BFF's public base URL, e.g. `https://api.arraes.com`. **Baked into the bundle at build time** — you must rebuild the SPA whenever this changes; it is not read at runtime. |

---

## 4. Build

Both build clean as of commit `ddca8f9`.

```bash
# SPA → dist/
npm install
npm run build            # tsc -b + vite build ; outputs dist/

# BFF → server/dist/
npm --prefix server install
npm --prefix server run build     # tsc -p tsconfig.json ; outputs server/dist/
```

The SPA bundle is ~668 KB (~173 KB gzipped). Vite warns it's over 500 KB —
advisory only; fine for an internal tool. Code-splitting is a later optimization.

---

## 5.0 Recommended path — ONE service (single origin)

For a single-tenant deploy this is by far the simplest: the BFF serves the
built SPA **and** the API on one origin, so there's **one deploy, no CORS, and
the session cookie works with zero domain juggling** (§6 becomes a non-issue).
Enabled by `SERVE_SPA=true` (added to `server/src/index.ts`).

```bash
# 1. Build the SPA with RELATIVE api calls (empty base → /api, /auth same-origin)
VITE_BFF_URL="" npm run build          # → dist/
# 2. Build the BFF
npm --prefix server run build          # → server/dist/
# 3. Run one process that serves both
SERVE_SPA=true node server/dist/index.js
```

Env for this mode: `SERVE_SPA=true`, `ALLOWED_ORIGIN=https://<your-site>` (its
own origin), plus `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`,
and the Google vars. The dist path auto-resolves to `repo/dist` (anchored to the
server file, cwd-independent); override with `SPA_DIR` if you deploy them apart.

**Any Node host works** (it's just one Node app). E.g. on **Render** → New
*Web Service* from the repo:
- Build: `npm install && VITE_BFF_URL="" npm run build && npm --prefix server install && npm --prefix server run build`
- Start: `SERVE_SPA=true node server/dist/index.js`
- Add the env vars above; attach a **persistent disk** if you want Google
  re-auth to survive restarts (token store, §5).
- Add your custom domain (Render gives HTTPS) → set `ALLOWED_ORIGIN` and the
  Google redirect URI to that domain.

Prefer the two-service split below only if you specifically want the SPA on a
CDN separate from the API — then §6's cookie rule applies.

---

## 5. Deploy the BFF (Node service)

1. Ship the repo (or just `server/` + its `package.json`/`node_modules`) to the host.
2. Set all `server/.env` vars in the host's environment/secret manager.
3. Build, then start:
   ```bash
   npm --prefix server run build
   npm --prefix server start        # node dist/index.js
   ```
4. Health check: `GET https://api.arraes.com/health` → JSON with `ok: true`,
   the missing-config list, and the agent status. Point the host's health probe
   at it.

**Persistence caveat — the token store is a local file.** The BFF writes OAuth
refresh tokens to `.tokens.json` (mode 0600) in its working directory. On hosts
with an **ephemeral filesystem** (Render free tier, Fly without a volume,
most PaaS), that file is wiped on every restart/redeploy → connected users must
re-authenticate with Google. For a durable deployment either (a) attach a
persistent volume/disk mounted at the working dir, or (b) implement the
production swap the code already anticipates: replace the file-backed store in
`server/src/tokenStore.ts` with a database (Postgres, KMS-wrapped keys) — the
module's interface is written to make this a drop-in. Until then, single
instance only (a file store doesn't share across replicas).

---

## 6. Deploy the SPA (static bundle) + wire the two together

1. **Set `VITE_BFF_URL`** to the BFF's public URL, then `npm run build`.
2. **Serve `dist/` as static files** on the SPA host.
3. **SPA-routing fallback (required).** The app uses client-side routing
   (`/deal/:id`, `/contacts/:id`, `/settings`, …). The static host must rewrite
   **all** unknown paths to `/index.html`, or a refresh/deep-link 404s:
   - Netlify: a `_redirects` file with `/*  /index.html  200`
   - Vercel: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
   - nginx: `location / { try_files $uri /index.html; }`
4. **CORS** is already handled by the BFF: it allows exactly `ALLOWED_ORIGIN`
   with credentials. Set `ALLOWED_ORIGIN` to the SPA origin — done.

### ⚠️ The session-cookie rule — get this right or auth silently fails

The BFF session cookie is `httpOnly; SameSite=Lax; Secure` (Secure auto-set when
`ALLOWED_ORIGIN` is https). `SameSite=Lax` cookies are sent on **same-site**
requests only — same-site means the **same registrable domain** (eTLD+1), not
the same host.

- ✅ **SPA and BFF on subdomains of one domain** — `app.arraes.com` (SPA) +
  `api.arraes.com` (BFF). Same site → the cookie is sent on the SPA's
  credentialed `fetch` to the BFF. **This is the recommended layout.**
- ❌ **SPA and BFF on different domains** — e.g. `aco.netlify.app` +
  `aco-bff.onrender.com`. Cross-site → the Lax cookie is **not** sent, so the
  BFF never sees the session and every user looks logged-out. If you must do
  this, change the cookie in `server/src/session.ts` to
  `sameSite: "none"` — browsers **reject** `SameSite=None` without `Secure`, so
  both origins must be https (the code already sets `secure` from the https
  `ALLOWED_ORIGIN`, which cross-site requires anyway) — and note some browsers
  block third-party cookies by default. Same-domain subdomains avoid all of this.

### Google OAuth redirect

Set `GOOGLE_REDIRECT_URI` to `https://api.<yourdomain>/auth/google/callback`
**and** add that exact URL to the OAuth client's *Authorized redirect URIs* in
Google Cloud. A mismatch is the most common OAuth failure.

---

## 7. Go-live checklist

- [ ] BFF: all `server/.env` vars set; `SESSION_SECRET` + `TOKEN_ENCRYPTION_KEY`
      are strong random values (not the example blanks).
- [ ] BFF: `ALLOWED_ORIGIN` = the SPA's https origin.
- [ ] BFF: `GET /health` returns `ok:true` and lists no missing **required**
      config (Google vars only matter if you're using Google).
- [ ] BFF: token store is durable (persistent volume or DB) — or you accept
      that Google re-auth is needed after each restart.
- [ ] SPA: built with `VITE_BFF_URL` = the BFF's https URL.
- [ ] SPA: static host rewrites unknown paths → `index.html`.
- [ ] SPA + BFF are same-site (subdomains of one domain), **or** the cookie is
      switched to `SameSite=None`.
- [ ] Google: `GOOGLE_REDIRECT_URI` matches an Authorized redirect URI in the
      Cloud console; consent screen = Internal.
- [ ] Agent: `ANTHROPIC_API_KEY` present if you want the real agent (else mock).

## 8. Smoke test after deploy

1. Open the SPA → it should render Command Center (demo/seed data from IndexedDB).
2. Settings › Integrations:
   - **Agent brain** → *"Live · Claude API · <model>"* if the key is set (else
     "mock agent").
   - **Google Workspace** → *"Not connected"* with an enabled **Connect** button
     (if Google is provisioned) — click it, complete OAuth, land back connected.
3. Approve one item in Intelligence › Act Now → confirm it writes an entry in
   Settings › Data & Privacy (the live audit ledger) and that **Undo** reverses
   it. That exercises Laws 1–3 end-to-end against the real deployment.

---

## 9. Known Phase-1 characteristics & production TODOs

Not blockers for an internal/demo deploy, but track them before this is a
multi-user product:

- **CRM data is client-side (IndexedDB).** No server DB for contacts/deals/etc.
  Server-side persistence + per-user data is a Phase-2+ workstream.
- **Token store is a local file.** Swap `tokenStore.ts` for a DB for durability
  and multi-instance (§5).
- **Non-Google connectors are mocked** (WhatsApp, MLS, Drive, DocuSign) behind
  adapters — they show as connected but don't call real services yet.
- **Bundle size** ~668 KB — code-split with dynamic `import()` if first-load
  latency matters.
- **Secrets rotation** — `SESSION_SECRET` / `TOKEN_ENCRYPTION_KEY` rotation
  invalidates existing sessions/encrypted tokens (users re-auth); plan a
  rotation runbook.
