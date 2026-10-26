# Android: first milestone

The native Expo / React Native app is in `apps/mobile`. The existing Next.js app remains at the repository root to preserve Upsun's current build and deploy commands. Shared, platform-neutral API types and input validation live in `packages/shared/mobile.ts`. The mobile app has a separate package manifest and lockfile so its React Native toolchain does not affect the web build.

## Implemented

- Existing email/password account sign-in over HTTPS, using revocable device tokens in SecureStore (passwords are not saved).
- Download that account's categories, lifts and complete workout history into SQLite.
- Native workout entry: choose a lift, enter kg/reps/optional RPE, add/remove sets, finish a workout.
- Added sets persist as a draft immediately; finished workouts enter a durable SQLite outbox atomically. Unsubmitted text fields are not saved until “Add set”.
- Sync on launch, reconnect, foreground, manual request and every 30 seconds while foregrounded.
- Pending workouts survive failed uploads, failed downloads and app restarts. An expired token requires reauthentication to the same account without removing local records.
- Server receipts prevent duplicate uploads and resurrection after a workout is deleted on the website. Reused IDs with different data return a conflict and preserve the local copy.
- Downloaded history is replaced only after a successful full snapshot, so website deletions and edits appear on the next sync. Local pending records remain separate.
- Account data is partitioned by HTTPS origin and user ID. Sign-out requires finishing/discarding drafts and confirming uploads, then revokes the token and removes the local cache. Android backups are disabled.

This is a first functional slice, not a Play Store release. Mobile editing/deleting of synced workouts, body-weight entry, personal-record charts, category/lift administration, conflict resolution UI, account deletion, background sync while closed, and production release assets are not implemented yet. Workout units are kilograms, matching the current web interface. Use a test account until device acceptance tests are completed.

## Backend / Upsun

Deploy the web changes to a preview environment first. The existing `npx prisma migrate deploy` hook installs the three new mobile tables; no production migration has been run as part of this development work. Existing accounts and workout tables are retained. The mobile API never uses the website's development authentication bypass.

Routes:

- `POST /api/mobile/v1/auth`: `{ email, password }` → device token (30 days), expiration and public user details.
- `DELETE /api/mobile/v1/auth`: revoke current bearer token.
- `GET /api/mobile/v1/sync`: authenticated full snapshot.
- `POST /api/mobile/v1/sync`: authenticated completed-workout mutation; acknowledges its UUID.

Bearer tokens are stored as SHA-256 digests on the server. Sign-in is limited atomically to 10 attempts per normalized email per 15 minutes across app instances. Before public launch, add gateway-level abuse controls and scheduled cleanup of expired tokens/login-limit rows. Retain mutation receipts for as long as the account exists. Future mobile editing needs entity revisions and deletion tombstones integrated into BOTH web and mobile writes; do not add last-write-wins overwrites to this API.

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
- Full repository lint: blocked by the existing `react-hooks/set-state-in-effect` error in `src/components/DateInput.tsx`.
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
