# A/CO BFF — thin Backend-for-Frontend (Phase 2)

Sits between the SPA and Google. Holds the OAuth client secret and refresh
tokens (encrypted, server-side); the browser only ever gets an httpOnly session
cookie. Read-first: Gmail/Calendar **read** now; send/write later, behind the
approval queue (Law 1) with an audit row per external call.

Full provisioning steps: `../design_handoff_fase1/phase2/01-google-gmail-calendar-setup.md`

## Run

```bash
cd server
cp .env.example .env        # then fill from Google Cloud (guide §5–6)
npm install
npm run dev                 # http://localhost:8787
```

The server boots even before `.env` is filled — `GET /health` reports what's
still missing, and the `/auth/*` routes 503 with the same list until configured.

Generate the local secrets:

```bash
openssl rand -base64 32     # SESSION_SECRET
openssl rand -base64 32     # TOKEN_ENCRYPTION_KEY (must decode to 32 bytes)
```

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness + config status |
| GET | `/auth/google/start` | begin OAuth (redirect to Google) |
| GET | `/auth/google/callback` | code→token exchange, sets session cookie |
| GET | `/auth/session` | `{ authed, email, name, configured }` |
| POST | `/auth/logout` | drop tokens + cookie |
| GET | `/api/gmail/threads?limit=20` | recent Inbox threads (read-only) |
| GET | `/api/calendar/events?limit=20` | upcoming events (read-only) |

## Notes

- **Colon-in-path repo:** run scripts via `node ./node_modules/.../bin` (already
  wired in `package.json`); avoid bare `tsc`/`tsx` shims. See the tooling memo.
- **Token store is dev-grade** (`.tokens.json`, gitignored). Production: swap
  `tokenStore.ts` for a real DB with KMS-wrapped keys — keep the same interface.
- **Stage 2b (later):** add `gmail.send` / `calendar.events` scopes and the
  write routes only once the SPA approval → send path calls them.
