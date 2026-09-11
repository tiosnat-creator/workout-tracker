# Lifting Log

A personal Olympic lifting tracker: sessions, a lift database with custom
categories, 1RM tracking, body weight, and a %-of-1RM calculator. Built with
Next.js (App Router, Server Actions), Prisma, and PostgreSQL, deployed on
Upsun.

## Access control — read this before deploying a new environment

**There is no per-user login in this app.** Access is gated entirely at the
HTTP layer, outside the codebase: every environment that should be
protected needs Upsun's HTTP basic-auth site gate applied by hand:

```bash
upsun environment:http-access -e <environment> --auth "access:<password>" --enabled 1
```

Without it, **anyone with the environment's URL has full unauthenticated
read/write access** to every lift, session, and body weight entry —
including delete actions. This includes any newly branched environment or
PR preview, which starts with no gate until you set one. `main` has this
applied already; a new preview environment does not inherit it
automatically.

The app itself resolves "the current user" as the single account
`prisma/seed.ts` maintains at `SEED_USER_EMAIL` — there's exactly one
tenant, and nothing distinguishes requests beyond the HTTP gate. Don't
change `SEED_USER_EMAIL` on an environment with existing data: the seed
upserts by email, so a new value creates a second, empty account and the
app starts serving that one — the original account's lifts/sessions/body
weight aren't deleted, just inaccessible until you change it back.

## Local development

```bash
npm install
npm run dev
```

Requires a `DATABASE_URL` pointing at a Postgres database (see
`.env.example`) — for this project that's normally an `upsun tunnel:open`
into a dev branch's database, since there's no local Postgres setup.

## Deploying

Push to a branch, open a PR against `main`. Upsun deploys a preview
environment automatically; `main` requires a passing PR before merging
(branch protection). Migrations and the seed script run automatically in
the deploy hook (`.upsun/config.yaml`).
