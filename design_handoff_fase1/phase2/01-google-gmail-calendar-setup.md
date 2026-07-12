# Phase 2 · Google integration setup (Gmail + Calendar)

**Goal of this document:** everything *you* (the Principal / project owner) must
provision in Google Cloud **before** any real-integration code is written. When
these steps are done and the values are in an `.env` you control, the next
coding step drops in cleanly.

You never paste secrets into a chat. Everything below produces values that live
only in your `.env` files on your machine / server.

---

## 0 · Architecture — why a thin backend (BFF)

Phase 1 is a client-only SPA (Vite + React + IndexedDB). Real Gmail/Calendar
access **cannot** be done safely from the browser alone:

- The OAuth **client secret** and **refresh tokens** must never reach the SPA.
- Gmail send and Calendar writes require server-side token handling.
- Google's token exchange (`authorization_code` → tokens) is a server call.

So Phase 2 adds a **thin Backend-for-Frontend (BFF)** — a small Node service
that sits between the SPA and Google:

```
  Browser (SPA)                BFF (Node, new /server)              Google
  ------------                 -----------------------              ------
  "Connect Google"  ─────────► /auth/google/start ───────────────► consent screen
        ◄──────────────────────  302 redirect  ◄────────────────────  ┘
  callback lands ───────────►  /auth/google/callback
                                 exchanges code → tokens
                                 stores refresh token (encrypted, server-side)
                                 sets an httpOnly session cookie
        ◄──────────────────────  session cookie
  Inbox / Activities ────────►  /api/gmail/threads
                                 /api/calendar/events   ───────────► Gmail / Calendar API
        ◄──────────────────────  normalized JSON  ◄──────────────────  ┘
```

**What the SPA keeps:** the same adapter *interfaces* it uses today. The mock
adapters (`src/data/drive.ts` is the template) get real siblings that call the
BFF instead of returning fixtures. The three laws still hold: the BFF **reads**
Gmail freely, but **sending** always goes through the existing approval queue —
nothing leaves without a human approve, and every external call writes an
`audit_log` row.

**Where things will live (built after this setup):**

| Concern | Location |
|---|---|
| BFF service | new `server/` (Node + TypeScript) |
| OAuth start/callback | `server/routes/auth.ts` |
| Gmail read/send | `server/routes/gmail.ts` |
| Calendar read/write | `server/routes/calendar.ts` |
| Token store (encrypted) | `server/tokenStore.ts` |
| SPA auth adapter | `src/data/adapters/googleAuth.ts` |
| SPA Gmail adapter | `src/data/adapters/gmail.ts` (feeds `screens/inbox`) |
| SPA Calendar adapter | `src/data/adapters/calendar.ts` (feeds `screens/activities`) |
| Real login | swap in-memory auth in `src/app/Login.tsx` + `state.tsx` |

---

## 1 · Create a Google Cloud project

1. Go to <https://console.cloud.google.com/>.
2. Top bar → project selector → **New Project**.
3. Name: `A-CO Pipeline Intelligence` (or similar). No org folder needed if you
   don't have one.
4. Create, then make sure it's the **selected** project (top bar).

---

## 2 · Enable the APIs

**APIs & Services → Library**, search and **Enable** each:

- **Gmail API**
- **Google Calendar API**
- *(optional now, useful later)* **People API** — for contact profile enrichment.

---

## 3 · OAuth consent screen

**APIs & Services → OAuth consent screen.**

### 3a · User type — this choice matters a lot

- **Internal** — available only if `arraes.com` is a **Google Workspace**
  organization and you sign in with a domain admin. **Strongly preferred:** an
  Internal app skips Google's verification/security-assessment process entirely
  (see §7). Only users in your Workspace can authorize it — which is exactly the
  case here (you are the sole operator).
- **External** — for any Gmail account. Works, but Gmail scopes are *restricted*
  and trigger Google verification before you can go to production (§7).

> **Recommendation:** if `arraes.com` is on Google Workspace, choose **Internal**.
> It removes the single biggest blocker in this whole plan.

### 3b · App information

- App name: `A/CO Pipeline Intelligence`
- User support email: `wictor@arraes.com`
- Developer contact email: `wictor@arraes.com`
- (Logo optional — needed for a polished External verification, skip for Internal.)

---

## 4 · Scopes — least privilege, in two stages

Add scopes on the consent screen. We stage them so read comes first and the
"agent operates, human approves" law is respected before any write scope exists.

### Stage 2a — read only (build & prove this first)

| Scope | Grants | Google class |
|---|---|---|
| `openid`, `email`, `profile` | sign-in identity | — |
| `https://www.googleapis.com/auth/gmail.readonly` | read threads/messages for Inbox | **Restricted** |
| `https://www.googleapis.com/auth/calendar.readonly` | read events for Activities | Sensitive |

### Stage 2b — write (add only when the approval→send path is wired)

| Scope | Grants | Google class |
|---|---|---|
| `https://www.googleapis.com/auth/gmail.send` | send approved drafts | Sensitive |
| `https://www.googleapis.com/auth/calendar.events` | create/update events | Sensitive |

> Do **not** add the Stage 2b scopes yet. They change the verification burden and
> aren't needed until we wire the send/confirm queue actions to real Gmail/Calendar.

---

## 5 · Create the OAuth client credentials

**APIs & Services → Credentials → Create Credentials → OAuth client ID.**

- Application type: **Web application**
- Name: `A-CO BFF`
- **Authorized JavaScript origins:**
  - `http://localhost:5173` (SPA dev)
  - *(prod SPA origin later)*
- **Authorized redirect URIs** (these point at the **BFF**, not the SPA):
  - `http://localhost:8787/auth/google/callback` (BFF dev)
  - *(prod BFF callback later)*

Create → you get a **Client ID** and **Client secret**. Keep the secret private
— it goes only in the BFF `.env` (§6), never in the SPA.

---

## 6 · Environment variables (you fill these on your machine)

Create these files **locally** — they are gitignored, never committed, never
pasted into chat.

**`server/.env`** (BFF — holds the secret):

```
GOOGLE_CLIENT_ID=<from step 5>
GOOGLE_CLIENT_SECRET=<from step 5>
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback
OAUTH_SCOPES=openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly
SESSION_SECRET=<random 32+ char string>
TOKEN_ENCRYPTION_KEY=<random 32-byte base64 — encrypts stored refresh tokens>
PORT=8787
ALLOWED_ORIGIN=http://localhost:5173
```

**`.env`** (SPA — no secrets, only the BFF URL):

```
VITE_BFF_URL=http://localhost:8787
```

I will add a committed **`server/.env.example`** and **`.env.example`** with these
keys blank so the shape is documented and the real files stay private.

---

## 7 · Verification / publishing — read before Stage 2b

Google's requirements depend on §3a:

- **Internal app (Workspace):** no verification. You can use all scopes above
  immediately with domain users. *This is the smooth path.*
- **External app:** while in **Testing** you may add up to 100 **test users**
  (add `wictor@arraes.com`) and use everything for development. But moving to
  **Production** with `gmail.readonly` (Restricted) requires **Google's OAuth
  verification**, and Restricted scopes may require an annual third-party
  **CASA security assessment** — this can take weeks and has cost implications.

> **Decision point:** confirm whether `arraes.com` is Google Workspace. If yes →
> Internal, and this section is a non-issue. If no → we develop under Testing/test
> users and plan the verification timeline before any production launch.

---

## 8 · What happens after you provision

Once §1–6 are done and your `.env` files exist, the build sequence is:

1. **BFF skeleton** (`server/`) — Node + TypeScript, `/auth/google/*`, encrypted
   token store, session cookie, CORS to the SPA.
2. **Real login** — replace the in-memory auth (`Login.tsx`, `state.tsx`) with
   "Continue with Google Workspace" → BFF OAuth. In-memory stays as a dev fallback.
3. **Gmail read adapter** — `src/data/adapters/gmail.ts` → `/api/gmail/threads`;
   `screens/inbox` reads real threads/messages instead of seed fixtures.
4. **Calendar read adapter** — `src/data/adapters/calendar.ts` →
   `/api/calendar/events`; `screens/activities` reads the real agenda.
5. **(Stage 2b, later)** wire the Inbox/Deal approval actions to `gmail.send` and
   the tour/confirm actions to `calendar.events` — always behind human approval,
   always audited.

Every step keeps the mock adapter as a fallback (feature-flagged by whether the
BFF is reachable), so the app never hard-breaks if Google is down or unconfigured.

---

## Your checklist

- [ ] §1 Project created and selected
- [ ] §2 Gmail API + Calendar API enabled
- [ ] §3 Consent screen configured — **Internal if `arraes.com` is Workspace**
- [ ] §4 Stage 2a (read-only) scopes added
- [ ] §5 OAuth **Web** client created; redirect URI is the **BFF** callback
- [ ] §6 `server/.env` filled locally (secret stays here); SPA `.env` has `VITE_BFF_URL`
- [ ] §7 Confirmed Internal vs External path
- [ ] Tell me it's done → I scaffold the BFF (step §8.1) and we go read-first

---

**Open question for you:** is `arraes.com` a Google Workspace domain? Your answer
decides Internal-vs-External and whether §7 is a five-minute step or a
multi-week verification track. Everything else above is the same either way.
