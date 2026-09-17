# Lifting Log

A personal Olympic lifting tracker: sessions, a lift database with custom
categories, 1RM tracking, body weight, and a %-of-1RM calculator. Built with
Next.js (App Router, Server Actions), Prisma, and PostgreSQL, deployed on
Upsun.

## Access control

Lifting Log is multi-tenant with passwordless, per-user login: anyone can
create an account at `/login` by requesting a "magic link" emailed to
them — there are no passwords anywhere in this app, ever. Every workout
table (`Category`, `Lift`, `Session`, `SetEntry`, `OneRepMaxEntry`,
`BodyWeightEntry`) is scoped to the signed-in user; nobody, including
admins, can see another user's workout data.

**Roles**: `MEMBER` (default, everyone gets this on signup), `ADMIN`
(promoted by the owner; can invite/view/disable accounts and — this is the
owner's call — assign the admin role, but has no route to anyone's workout
data), and `OWNER` (exactly one, bootstrapped via the `OWNER_EMAIL` env var
in `prisma/seed.ts`, enforced as unique at the DB layer). Manage roles and
accounts at `/admin/users` — visible only to `OWNER`/`ADMIN`.

**Email is encrypted at rest**, not stored as plaintext: `emailCiphertext`
(AES-256-GCM) plus a separate HMAC-SHA256 `emailHash` blind index for
lookups, since an encrypted value with a random IV can't be queried by
equality. See `src/lib/email-crypto.ts`. This protects against a DB-only
compromise (a leaked backup, read-only SQLi) — not a compromise of the app
server itself, since the encryption keys live in its environment.

Sessions are DB-backed (`UserSession`, not a JWT), specifically so an admin
disabling an account — or a user hitting "log out of all devices" on
`/account` — revokes access immediately rather than waiting for a token to
expire.

The Upsun HTTP basic-auth site gate previously used for this app has been
removed on `main` now that real per-user auth exists as the access
boundary. **Don't remove it from an environment until this feature (and
its admin disable tooling) has actually been deployed and confirmed
working there** — otherwise there's a window where open signup exists with
no moderation lever yet.

### Schema migration note (temporary)

`prisma/schema.prisma`'s `User` model still carries the legacy `email`/
`passwordHash` columns from the pre-auth, single-tenant era — kept
deliberately so `prisma/seed.ts` can backfill the new encrypted-email
columns onto the *existing* owner row (preserving its `id`, and therefore
all the workout data already attached to it) before a follow-up migration
drops them. Don't ship a migration dropping `email`/`passwordHash` until
you've confirmed this deploy's seed ran successfully and you can log in as
the owner via magic link.

## Local development

```bash
npm install
npm run dev
```

Requires a `DATABASE_URL` pointing at a Postgres database (see
`.env.example`) — for this project that's normally an `upsun tunnel:open`
into a dev branch's database, since there's no local Postgres setup. Also
set `OWNER_EMAIL`, `EMAIL_ENCRYPTION_KEY`, and `EMAIL_HMAC_KEY` (generate
the latter two with `openssl rand -base64 32` each, and keep them
different from each other). `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are
required for email sign-in in every environment, including local development.
Without either value, requesting and redeeming links is disabled. Login links
are never printed to the console. Use a controlled test mailbox for development.

## Deploying

Push to a branch, open a PR against `main`. Upsun deploys a preview
environment automatically; `main` requires a passing PR before merging
(branch protection). Migrations and the seed script run automatically in
the deploy hook (`.upsun/config.yaml`).

These are secrets, not `.upsun/config.yaml` variables — set them per
environment with `upsun variable:create --sensitive` (or your project's
Upsun dashboard) before deploying: `OWNER_EMAIL`, `EMAIL_ENCRYPTION_KEY`,
`EMAIL_HMAC_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
Configure Resend only in environments where real email delivery is intended.
Previews without email configuration cannot request or redeem login links;
there is no log-based login fallback. To test login in a preview, use isolated
test data and a controlled test mailbox with appropriately scoped credentials.
