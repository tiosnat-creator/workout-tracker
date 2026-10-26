# Signup testing

Branch: `codex/signup-onboarding`.

## Preview setup

1. Deploy this branch to a separate Upsun preview with an isolated database.
2. Let the deploy hook run `prisma migrate deploy`. The new migration adds gender,
   onboarding completion, and token purpose. Existing accounts are marked complete
   so their login flow does not change. Existing outstanding links default to LOGIN
   and cannot create accounts; use a fresh signup link for a new address.
3. Configure `DATABASE_URL` via the database relationship, `OWNER_EMAIL`,
   `EMAIL_ENCRYPTION_KEY`, `EMAIL_HMAC_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`.
   Keep preview email keys stable across requests; use a verified Resend sender.
4. Use test email addresses you control. Plus-address aliases work if your mailbox
   supports them (for example your-name+signup1@your-mail-domain). Use a new alias
   per fresh-account scenario. Do not remove production users just to repeat a test.

This branch has no bypass, test-only login route, or token-log fallback. Mail
configuration is required even on previews. If it is absent, login and signup
report temporary unavailability. Automated tests use mocked mail delivery and
synthetic identities and send no real emails.

## Manual scenarios

| Scenario | Steps | Expected result |
| --- | --- | --- |
| New signup | Open `/signup`, enter a fresh test email, follow the email link and click Continue | Profile form appears only after email verification; no account exists before link redemption |
| Male profile | Enter `TestLifter1`, Male, `80.5`, finish signup | Dashboard opens; Account shows username/Male; Body Weight shows one 80.5 kg entry |
| Female profile | Repeat with a second fresh address, `TestLifter2`, Female, `65` | Account shows username/Female; Body Weight shows one 65 kg entry |
| Validation | Leave fields empty; try a two-character username or zero/negative weight | Form stays incomplete with validation feedback; server also rejects malformed submissions |
| Session identity | Do not supply any account identifier when saving the profile | Details belong to the verified session's account |
| Interrupted signup | Verify email, sign out on profile page, request a login link for that address | Returns to unfinished profile; after saving, future login goes to dashboard |
| Route bypass | Before completing the profile, visit `/`, `/account`, or `/sessions` | Redirects to `/signup/profile` |
| Existing account | Request a login link for an existing customer | Goes directly to dashboard; no mandatory new profile form |
| Existing signup | Request a signup link for an already registered email | Verifies mailbox, then resumes the account without overwriting its profile or creating a second account |
| Unknown login | Enter an unused email on `/login` | Generic confirmation, no login email and no new account; Sign up link remains available |
| Used/expired link | Reuse a consumed link, or wait over 15 minutes | Invalid-link message; no new session |
| Repeat submission | Double-click Finish sign up or resubmit the profile action | Only one initial weight entry; completed profile is not overwritten |
| Mail unavailable | On the isolated preview, omit either required Resend setting | Temporary-unavailability message, no issued token or logged magic link |

Weight accepts 0.1–1,000 kg with up to one decimal place. It is recorded in the
existing Body Weight history, not a second independent profile-weight field.
Username is a display name and is not globally unique. Existing users may have
blank username/gender until a separate profile-editing feature is added.

## Automated checks

```sh
npm test
npx prisma validate
npx next typegen
npx tsc --noEmit
npm run build
```

Prisma commands/build need a syntactically valid `DATABASE_URL`. Generating and
validating the client does not connect to that database. `npm test` tests actual
transpiled functions with mocked database/mail services: flow separation, both
gender values, field validation, expired/used links, session ownership, onboarding
gates, duplicate submissions, and the previous fail-closed mail protections.
Run the manual scenarios against the preview to verify real email/database behavior.

## Starter lifts

New signups receive 14 starter lifts in Snatch, Clean & Jerk, Squat, Pull and
Press, plus an Uncategorized fallback category. They belong to the new account.
For an account created before this change with no lifts, open **Account → Add
starter lifts**. Repeating the action does not duplicate the catalog or overwrite
existing lift settings. This action does not copy another customer's training data.
