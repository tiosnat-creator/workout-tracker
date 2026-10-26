# Pre-production security review — 26 October 2026

**Decision: hold production promotion until the blockers below are resolved and retested.**

Reviewed branch `codex/android-preview`, commit `83b577e`, including the web application, mobile API, Expo source, dependency locks and Upsun configuration. This was a source/dependency review with bounded local reproductions and isolated API tests, not a full penetration test or installed-APK assessment. No application fixes, dependency upgrades, credential rotations or production deployments were performed.

## Findings

### 1. High — database credentials appear in retained deployment logs (confirmed)

`.upsun/config.yaml:24–25` enables shell tracing with `set -eux` before expanding the database password into `DATABASE_URL`. Inspection of successful preview deployment activity `z662b745xmwl2` confirmed a traced assignment containing a non-placeholder credential. Its value was deliberately excluded from scan output and this report.

Remove shell tracing around all secret handling (use `set -eu`), review access to retained logs and coordinate rotation of the exposed credential. Check other environments using the same hook; production logs were not inspected, so production exposure is not asserted. Verify a subsequent deployment has no credential-bearing trace before promotion.

### 2. Critical advisory severity — vulnerable web dependencies (production blocker)

Installed Next.js is `16.3.4`. The audit reports 10 affected package entries: 1 critical, 8 high and 1 moderate. Excluding development dependencies leaves 8 entries: 1 critical, 6 high and 1 moderate. These are package counts, not counts of independent exploitable vulnerabilities.

Relevant primary advisories:

- [Server Action denial of service](https://github.com/advisories/GHSA-p3m5-59mp-jv5r): the app uses App Router and Server Actions, satisfying the relevant application prerequisite. Patched in Next.js 16.4.1. No exploit payload was run.
- [Image optimization SVG remote code execution](https://github.com/advisories/GHSA-2464-fhr4-w9xw): conditional on the affected image-processing path and platform; patched in Next.js 16.4.1 or sharp 0.35.5. No applicable custom SVG/image-optimization usage was found. Remote code execution was not demonstrated.
- [ImageResponse remote code execution](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j): requires attacker-controlled SVG input to the affected API. No `next/og` or `ImageResponse` usage was found. Patched in Next.js 16.3.6.

The audit proposes Next.js 16.4.3. Upgrade to a compatible patched version, resolve the transitive advisory paths, then rerun the build and regression tests. Other reported paths include sharp, Prisma/config/deepmerge-ts, mysql2, source-map-js and fast-uri, plus development tooling. The application uses PostgreSQL; no mysql2 runtime exploit path was demonstrated.

The mobile dependency tree reports 5 high-severity affected entries: expo, @expo/cli, @expo/code-signing-certificates, node-forge and zod. Several entries share a CLI/toolchain dependency path. [The node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) did not list a patched version at review time. Do not apply npm's proposed Expo downgrade blindly. Establish a compatible upstream remediation and distinguish build-tool exposure from shipped runtime code; APK exploitability has not been demonstrated.

### 3. High, deployment-dependent — web login emails trust request headers

`src/lib/auth-actions.ts:33–36` constructs login-link origins from `x-forwarded-host` / `host` and `x-forwarded-proto`. A local harness executing the actual function with mocked request headers produced an outgoing login URL with origin `http://attacker.invalid`. If the edge forwards attacker-controlled values, a user following the resulting email can disclose the login token to that destination.

Use a configured canonical HTTPS origin for web login emails and validate it at startup. Verify proxy behavior separately. The source behavior is confirmed; remote header spoofing through Upsun was not tested. No real emails were sent during reproduction. The new mobile flow already uses a configured trusted origin.

### 4. Medium — web email throttling can be bypassed (confirmed locally)

`src/lib/auth-actions.ts:69–89` deletes consumed/expired magic-link tokens before counting recent requests. Successful consumption therefore removes rate-limit history. A mocked reproduction using the actual function sent 10 messages within one simulated minute despite the configured limit of 5 per hour. Separate count/create operations also lack an atomic admission limit.

Use independent, atomic request counters with expiry, including aggregate abuse controls. Do not derive request history from consumable authentication tokens. Retest sequential consumption and concurrent requests.

### 5. Medium — mobile email limit does not bound challenge writes (confirmed locally)

`src/app/api/mobile/v1/magic/route.ts:26–37` increments an email counter but creates a database challenge even for unknown, disabled or rate-limited accounts. A mocked execution of the actual route produced 8 challenge rows for 8 requests despite the email limit of 3 per 15 minutes. Distinct email hashes can also grow the counter table, which has no observed expiry cleanup.

Keep responses non-enumerating while bounding persisted challenges and total request volume. Add counter retention/cleanup and avoid global expired-challenge cleanup work on every unauthenticated request. No load or storage-exhaustion test was run against a hosted database.

## Deployment and privacy follow-up

- Preview was initialized from the main environment's data. Resend and email encryption/HMAC keys are inherited. Metadata confirms these three variables are sensitive, runtime-only and inheritable; their values were not displayed. Isolate preview data, credentials and mail delivery before treating it as a safe test environment.
- Preview explicitly enables legacy mobile password login for testing. Ensure `MOBILE_PASSWORD_LOGIN` is absent or false in production and verify that behavior after deployment.
- Legacy plaintext email fields remain in the schema/backfill path. Review migration and removal of legacy personal data; live row contents were not inspected or counted.
- The local `.env` file has mode `0644`; restrict it to the owning user. Parent directory permissions/ACLs were not assessed.
- Mobile tokens and pending login secrets use SecureStore; workout data is stored in unencrypted SQLite inside the app sandbox, and Android backup is disabled. Offline data remains on a device after server-side revocation. Confirm this matches the intended privacy policy; no device extraction or binary analysis was performed.

## Checks completed

- Gitleaks 8.30.1 scanned all reachable Git history: 52 commits, approximately 1.35 MB, no detected secrets.
- An additional exact-value check compared three current local secret values against 396 historical blobs: no matches. Values were kept out of output. This does not negate the deployment-log finding.
- Web regression suite: **37 passed**.
- Mobile unit suite: **9 passed**.
- API integration suite against a disposable local PostgreSQL database: **2 passed**. Coverage includes account isolation, idempotent retries, deletion, input validation, stale changes, foreign references, disabled accounts, token revocation and throttling; magic-link coverage includes email confirmation, device verifier, replay, concurrent claims and revocation.
- Local bounded reproductions confirmed findings 3–5 without contacting Resend or modifying hosted user records.
- Source review found mobile ownership checks, bounded JSON request bodies, durable mutation receipts, bearer-token hashing, expiry/disabled-account checks and device-bound mobile magic-link claims.

## Release gate

Fix credential tracing and address exposed credentials; patch applicable dependency advisories; use a trusted web authentication origin; repair both authentication abuse controls; isolate preview resources and verify production authentication flags. Rerun audits and security regression tests after fixes, then perform installed-device and deployed configuration checks. Passing functional tests alone does not clear these findings.

Raw npm audit JSON and the sanitized local reproduction harness were retained under `/private/tmp/workout-security-*` for this review session; they are temporary artifacts. The pre-existing `SECURITY_REVIEW.md` was left unchanged.
