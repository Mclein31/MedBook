# Medical Records Backend

Node/Express + PostgreSQL API for the secure medical records app. Steps 1–7 of the build plan.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
npm run migrate        # creates the users / medical_records / shared_access tables
npm run dev            # starts on http://localhost:4000 with auto-reload
```

You need a real Postgres database for anything beyond `/health` to work — a free one
from Supabase, Neon, or Railway works fine for development. Put its connection string
in `DATABASE_URL`.

## Project structure

```
src/
  app.js              Express app, route mounting
  server.js            Entry point (app.listen)
  config/db.js          pg Pool, reads DATABASE_URL
  migrations/           schema.sql + a tiny runner (npm run migrate)
  models/               Thin query layers (no ORM) — user, record, share
  controllers/          Request handlers
  middleware/           JWT auth guard, centralized error handler
  services/aiService.js OpenAI-backed summarize/organize/explain
  routes/               Express routers, mounted in app.js
  utils/token.js         Secure random token generator for sharing
```

## Auth

- `POST /auth/register` — `{ name, email, password }` → `{ token, user }`
- `POST /auth/login` — `{ email, password }` → `{ token, user }`
- `GET /auth/me` — requires `Authorization: Bearer <token>`

All other routes below (except the public share-by-token route) require that same
`Authorization: Bearer <token>` header.

## Medical records (all scoped to the logged-in user)

- `POST /records` — `{ type, title, description?, date }`
  `type` must be one of: `consultation, diagnosis, lab, prescription, medication, appointment, other`
- `GET /records` — optional `?type=lab` filter
- `GET /records/:id`
- `DELETE /records/:id`

A user can only ever read/modify records where `user_id` matches their own JWT — there's
no way to fetch another user's record by guessing an id.

## Sharing (QR / token)

- `POST /share` — (auth required) optional body `{ ttlMinutes, allowedTypes: ["lab","diagnosis"] }`
  → `{ token, expiresAt, allowedTypes }`. Default TTL is 60 minutes
  (`SHARE_TOKEN_DEFAULT_TTL_MINUTES` in `.env`).
- `GET /share` — (auth required) list all share links you've created, active or not
- `DELETE /share/:id` — (auth required) revoke a share link early
- `GET /share/:token` — **public, no auth.** This is the URL the doctor's QR scan hits.
  Returns the records if the token is valid, unexpired, and unrevoked; otherwise 404.

Flow: the mobile app calls `POST /share`, encodes the returned `token` into a QR code,
the doctor's device scans it and calls `GET /share/:token` directly (or your app does it
on their behalf after they enter the code). The token is the credential — keep TTLs
short and let patients revoke a share immediately from the app.

## AI (all auth required)

Backed by `services/aiService.js` using the OpenAI API (`OPENAI_API_KEY`, `OPENAI_MODEL`
in `.env`, defaults to `gpt-4o-mini`). Every prompt is wrapped in a safety preamble that
forbids medical advice/diagnosis and instructs the model to only summarize, organize, or
plain-language-explain what's already written.

- `POST /ai/summarize` — optional `{ type }` to scope to one record type.
  Pulls the caller's own records server-side (no need to pass them in the body).
  → `{ summary, currentMedications, diagnoses, keyNotes }`
- `POST /ai/organize` — `{ text }` → `{ category, confidence, reasoning }`
- `POST /ai/explain` — `{ text }` → `{ explanation }`

## Security notes for production

- `JWT_SECRET` must be long and random (`openssl rand -hex 64`) and never committed.
- Passwords are hashed with bcrypt, 12 salt rounds.
- Share tokens are 256-bit random, single-purpose, time-limited, and revocable — they are
  not JWTs and carry no other permissions.
- Consider adding rate limiting (e.g. `express-rate-limit`) on `/auth/login` and the
  public `/share/:token` route before going to production.
- This API doesn't encrypt record contents at rest beyond whatever Postgres-level
  encryption your host provides — for real PHI, add column-level encryption or use a
  HIPAA-eligible managed Postgres offering, plus a signed BAA with your AI provider.
