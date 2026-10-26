# Android preview

The native Expo / React Native app is in `apps/mobile`. The existing Next.js app remains at the repository root to preserve Upsun's current build and deploy commands. Shared, platform-neutral API types and input validation live in `packages/shared/mobile.ts`. The mobile app has a separate package manifest and lockfile so its React Native toolchain does not affect the web build.

## Implemented in the 1.1 preview

- Dashboard with per-category best tested/estimated 1RMs and workout history.
- Lift library, per-lift recent sets, progress bars, manual 1RM tests with date and notes, and a shortcut to log sets for a lift.
- Native workouts with date/notes, kg, reps and optional RPE. Added sets persist as a SQLite draft. Completed workouts can have sets added/removed and can be deleted.
- Percentage and estimated-1RM calculators, available offline.
- Body-weight entries with date/notes, latest value, progress history and deletion.
- Create/rename/reassign/archive/unarchive lifts; create/rename/delete categories. Deleting a category moves its lifts to Uncategorized. Drag handles in Arrange dashboard and accessible Move up/down controls in Manage library arrange categories and lifts.
- SQLite-backed offline changes, immediate local projection, reconnect/foreground/manual/30-second sync. Pending changes survive app restarts and authentication expiry. Account & sync shows pending entries and allows explicit discard of unconfirmed local changes.
- Durable server receipts prevent duplicate writes or resurrection after deletion. Edits compare their previous content in a serializable transaction; stale edits return a conflict rather than overwriting website changes. A conflict currently blocks subsequent uploads until the user reviews/discards it; downloading still continues.
- Email-link sign-in using the existing encrypted account lookup and Resend service. The email link opens an explicit browser confirmation; return to the requesting phone to complete sign-in. A device-only verifier is kept in SecureStore. No Resend key or email token is embedded in the APK. Password login is disabled by default and can be enabled only for legacy preview test accounts with `MOBILE_PASSWORD_LOGIN=true`.

Native device acceptance is still required. This is not a Play Store release. User administration, new-account onboarding, and the newer web session-planning lifecycle are outside the previously agreed feature list and remain on the website. Planned/in-progress sessions cannot be edited by the mobile API. Completed planned-session set links are retained. Full-screen charts currently use accessible horizontal bars, not the web chart component. Drag reordering needs device gesture verification.

## Preview environment configuration

The branch includes the current web main branch (including magic-link accounts and session-planning schema). Existing web migrations and the new `20261026120000_mobile_magic` migration must run before installing the updated APK.

Set `AUTH_ORIGIN` to the exact trusted HTTPS origin for both web and mobile email confirmations (`MOBILE_AUTH_ORIGIN` remains a fallback). Configure it separately per environment; missing or invalid configuration disables issuance. Keep `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_HMAC_KEY` and `EMAIL_ENCRYPTION_KEY` server-side; never copy them into Expo environment variables. Isolate preview data and keys before release. The existing web seed uses `OWNER_EMAIL`; the old seed email/password variables are no longer used. Do not run tests against copied production accounts. The dedicated preview password account remains usable only while the preview-only password flag is enabled; production must leave it disabled.

Authentication requests use atomic database counters independent of tokens: web links allow 5 requests/address/hour, mobile links 3/address/15 minutes, and preview password login 10/address/15 minutes. A shared 1,000 requests/hour ceiling bounds rotating-address storage and email abuse; exhausting it temporarily denies new sign-in requests across these entry points. Counter and expired challenge/token cleanup runs on the first admitted request in each global hour. This application cap does not replace ingress traffic protection. No caller-supplied IP header is trusted for admission.

## Backend / Upsun

Deploy the web changes to a preview environment first. The existing `npx prisma migrate deploy` hook installs the mobile tables; no production migration has been run as part of this development work. Existing accounts and workout tables are retained. The mobile API never uses the website's development authentication bypass.

Routes:

- `POST /api/mobile/v1/magic`: request an email challenge, confirm the email token, then claim on the requesting device; returns a 30-day device token.
- `POST /api/mobile/v1/auth`: optional legacy preview password login, off by default.
- `DELETE /api/mobile/v1/auth`: revoke current bearer token.
- `GET /api/mobile/v1/sync`: authenticated full snapshot.
- `POST /api/mobile/v1/sync`: authenticated workout, manual 1RM or compare-and-swap entity change; acknowledges its UUID.

Bearer tokens are stored as SHA-256 digests on the server. Sign-in is limited atomically to 10 attempts per normalized email per 15 minutes across app instances. Before public launch, add gateway-level abuse controls and scheduled cleanup of expired tokens/login-limit rows. Retain mutation receipts for as long as the account exists. Entity edits compare canonical content read within a serializable transaction, including edits made by the existing web actions. Receipt retention ensures delayed deletes/creates cannot resurrect data. Do not add last-write-wins writes.

Full snapshots keep the first protocol simple. Pagination/delta sync is a later scalability improvement. Conflicting uploads currently keep their local data and display an error; a blocked record can delay later uploads until resolution support is added. Mobile API v1 must remain backward compatible as installed clients can lag behind web deployments.

## Run and check locally

From the repository root:

```sh
npm ci
npm run test:mobile
npx tsc --noEmit
```

Prisma configuration requires `DATABASE_URL` even for client generation. Use a local/test database URL; do not point integration tests at hosted user data.

Then:

```sh
cd apps/mobile
npm ci
npm run typecheck
npm run lint
npx expo-doctor
npm run export:android
npm start
```

The sign-in form accepts the HTTPS origin of your deployed website. Optionally set `EXPO_PUBLIC_API_URL` in a mobile `.env.local` to prefill it; it is public configuration, never a secret. The initial download needs deployed mobile routes, migrations and an account with existing lifts. The API URL can point to an Upsun preview; production builds should eventually pin the production origin rather than expose this development field.

The generated project currently uses Expo SDK 58. Expo Go must support this exact SDK; during the SDK 58 transition the Play Store Expo Go build may still support SDK 57. Check https://expo.dev/go or use a preview APK. A development QR session requires the development computer/network and is not sufficient proof of a standalone offline cold start.

## Installable APK and Play Store bundle

`eas.json` includes an internal preview APK and a production AAB profile. The app is linked to `@tiosnat89s-team/workout-tracker` (project `e72015a9-cb48-4466-8637-15d90e6608d9`) with Android package `com.askr.workouttracker`. Expo manages the signing key. The repository-root `.easignore` includes only `apps/mobile` and `packages/shared` in cloud build uploads. React DOM is pinned to the Expo-compatible version to avoid peer dependency conflicts during clean cloud installs.

```sh
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

An EAS preview APK includes its JavaScript bundle and can launch without Metro. Install it on a physical phone or emulator. An internal cloud build and Expo-managed signing key have been configured. No store submission or production deployment has been performed. Production later uses `--profile production`; distribution then requires the Play developer account, store metadata/privacy disclosures, device testing and Google review.

## Acceptance test on Android

1. Sign in to an Upsun test environment with an existing account and lift library. Verify history matches the website.
2. Enable airplane mode. Start a workout; add several sets. Force-stop and reopen the app. Confirm the unfinished draft and history remain.
3. Finish the workout offline; force-stop/reopen again. Confirm it remains marked as saved on the phone.
4. Reconnect and keep the app open. Confirm sync completes and the workout appears exactly once on the website.
5. Repeat sync, interrupt connectivity mid-upload and retry. No duplicates should appear.
6. Edit or delete a synced workout on the website; sync the phone and verify the change appears without resurrecting the old data.
7. Expire/revoke the device token in the test environment. Log a workout offline, reconnect, and sign in again to the same account. Verify queued data survives.
8. Attempt sign-out with an unfinished draft or pending workout. It must be blocked. Finish/sync, sign out, then sign in as a different test user. No data from the first account should appear.
9. Check keyboard behaviour, small screens, large fonts, Android back navigation and airplane-mode cold launch in the installed APK.

## API integration tests

Use an isolated PostgreSQL database named `workout_mobile_test` on localhost. Apply migrations with that `DATABASE_URL`, then start Next on localhost with the same database and a test `AUTH_SECRET`:

```sh
npx prisma migrate deploy
npm run dev -- --hostname 127.0.0.1 --port 3105
```

In another terminal with the SAME test database URL:

```sh
MOBILE_TEST_ORIGIN=http://127.0.0.1:3105 npm run test:mobile:api
```

The integration test refuses non-localhost databases or other database names and creates temporary accounts. It checks authorization, concurrent replay, cross-user lift rejection, validation, web edit preservation, deletion/retry behaviour, token expiry/revocation and login throttling. It skips if the two environment variables are absent; a skipped test is not a successful integration run.

## Validation recorded during implementation

- Web production build: passed against the isolated test database.
- Android JavaScript/Hermes export: passed (this is not an APK/native build).
- Expo Doctor: 20/20 checks passed.
- Mobile TypeScript and lint: passed.
- Web TypeScript and lint for new API/shared/tests: passed.
- Sync/validation tests: 7 passed.
- Live API integration suite: passed against temporary local PostgreSQL 16, including concurrent uploads.
- Full repository lint: passed after merging the current web main branch.
- Mobile dependency audit: 5 high findings in the Expo CLI dependency chain (`node-forge` and `zod`, including their parent packages). The suggested automatic fix downgrades Expo to SDK 44; it was not applied. Track compatible upstream fixes before release. These findings are tooling-related and are not proof of an exploitable app path.
- Native APK compilation: passed on Expo EAS on 25 October 2026. Emulator/phone testing is still required; no Android SDK/emulator was found on this workstation.

## Preview rollout — 25 October 2026

- Code is on GitHub branch `codex/android-preview`; production remains unchanged.
- First EAS build failed during installation because the automatically selected React DOM peer did not match React. This was fixed by explicitly adding Expo-compatible React DOM and verifying `npm ci`, TypeScript and lint.
- Replacement APK build: https://expo.dev/accounts/tiosnat89s-team/projects/workout-tracker/builds/879418f9-37ab-4236-8f6b-bdfdc619a425
- Upsun GitHub integration authentication was renewed and validated. The preview build and mobile database migration succeeded. The missing seed account variables were configured as sensitive, runtime-only, non-inheritable preview variables on 26 October; redeployment `7fs4psdbxxcjc` completed successfully. Authentication is explicitly enabled (`AUTH_DISABLED=false`). Production is unchanged.
- Activation logs show that Upsun cloned the parent database. A separate, randomly named test account now has 14 starter lifts and no workouts. Sign-in and authenticated initial sync passed, and the verification token was revoked. Existing copied accounts were not modified; use only the dedicated test account for device acceptance tests.
- Preview origin: https://codex-android-preview-sezopsi-ufvziel52vw7w.eu-5.platformsh.site
- Use a fresh preview database for testing. Do not point the app at production until the mobile API has been deliberately deployed there.

Successful internal preview APK: https://expo.dev/artifacts/eas/mvBVWEorpFBkHZzx0UCqx7BvbuCQwRPDkfjoCpwNVNg.apk

## Expanded preview acceptance

1. Upgrade the APK in place without uninstalling: confirm the existing cache/draft remains.
2. In airplane mode, create a category/lift, log a manual 1RM and body weight; reopen and verify all remain visible.
3. Edit a completed workout, remove/add sets, delete an entry and rearrange categories/lifts; reconnect and confirm the same result on the website.
4. Change the same lift on the website while an offline phone edit is pending. Confirm sync reports a conflict and the website edit survives; review/discard the local edit in Account & sync.
5. Request an email link, open and confirm it, return to the app. Reopening the email must not authorize a different phone. Verify sign-out and web “log out everywhere” revoke the device token.
6. Confirm copied production accounts are not used for destructive tests. Native keyboard, back navigation, font scaling and visual QA are still needed on an installed build.

## 26 October expanded preview release

- Preview branch includes web main through `a129496`; expanded implementation commit: `1f4b59b`.
- Upsun activity `z662b745xmwl2` completed successfully. Live test-account login and expanded snapshot passed; magic-link request/claim routes accepted the expected generic unknown-account flow without sending email.
- Local validation: 37 web regression tests, 9 sync/unit tests and 2 API integration scenarios passed; root/mobile TypeScript, root/mobile lint, production web build and Android Hermes export passed.
- Android version 1.1.0, versionCode 2, signed with the existing key. EAS build: https://expo.dev/accounts/tiosnat89s-team/projects/workout-tracker/builds/3f5f8ba5-752d-4f27-9817-55686bb04a09 (queued at handoff; build completion is not yet verified).
- Install the new APK over the old app; do not uninstall if you have unsynced data. Keep using the preview origin. Real email delivery and installed-device interaction/offline acceptance still need verification.
