# Security fixes and rescan — 26 October 2026

Status: repository fixes implemented and locally verified; **production is not yet cleared**. Changes are in the working tree on `codex/android-preview`, based on `83b577e`. No hosted deployment, secret rotation or production data change was performed.

## Implemented

- Removed `set -x` from Upsun build/deploy hooks so expanded database credentials are no longer traced by these hooks.
- Upgraded Next.js and matching ESLint configuration to 16.4.3 and refreshed compatible web dependencies. The complete web npm audit now reports **zero vulnerabilities** (previously 10 affected entries).
- Web and mobile login emails use a validated, configured HTTPS origin. Request host/proxy headers cannot choose the destination. `AUTH_ORIGIN` is preferred; `MOBILE_AUTH_ORIGIN` supports the existing preview configuration. Missing/invalid configuration fails closed.
- Replaced token-history throttling with atomic database request counters that survive token consumption and delivery failure. Web allowance: 5/address/hour; mobile magic links: 3/address/15 minutes; optional preview passwords: 10/address/15 minutes.
- Added a shared 1,000-request/hour admission ceiling before per-address writes. This bounds rotating-address counter growth and challenge issuance. Rejected mobile requests return random opaque IDs without persisting challenges. Account eligibility is not included in the response.
- Cleanup of expired counters/challenges/tokens runs once per global window under the global row lock, instead of on every mobile request. Existing `MobileLoginLimit` storage is reused; no new schema migration is required by these fixes.
- Restricted the local `.env` file to mode `0600`.
- Updated compatible mobile lockfile dependencies without changing the Expo SDK.

The global cap intentionally trades temporary sign-in availability for bounded resource/email use when exhausted. Existing sessions and mobile token claims remain usable. It is not a substitute for ingress-level denial-of-service protection. Client-supplied IP headers are not trusted.

## Verification

| Check | Result |
| --- | --- |
| Web tests including four new security regressions | 41 passed; no skips with disposable DB configured |
| Mobile unit tests | 9 passed |
| API security/integration tests against the patched production build | 2 passed |
| Real PostgreSQL concurrent admission test | Exactly 5 of 20 requests admitted; reset, cleanup and global-cap checks passed |
| Mobile challenge abuse regression | 8 requests create only 3 challenge rows; rejected requests still receive opaque IDs |
| Origin validation and web issuance regressions | Passed; invalid/non-HTTPS origins rejected; 10 attempts send only 5 emails |
| Web dependency audit | 0 vulnerabilities |
| Mobile dependency audit | 5 high affected package entries remain; see below |
| Gitleaks Git history | 52 commits; no detected secrets |
| Gitleaks current tracked/nonignored source snapshot | No detected secrets |
| Web and mobile lint/type checks | Passed |
| Next.js production build | Passed using `next build --webpack` |
| Android Metro export | Passed, 1,204 modules |
| Whitespace/diff check | Passed |

The default Turbopack build could not complete in this execution environment: an initial font-network failure was followed by a subprocess port-binding permission error. The supported webpack build compiled, typechecked, generated routes and ran the API tests successfully. The default hosted build still needs verification. No installed-APK penetration test or hosted attack traffic was performed.

A separate scan including ignored local files reported 15 matches: three in the local `.env` and twelve in generated Next.js cache/server manifests. These are local runtime/build secrets, not findings in the source snapshot or Git history. Their values were not printed; `.env` and `.next` are Git-ignored. Keep generated server artifacts private and never publish them as static client assets.

## Remaining release work

1. **Rotate the database credential already exposed in preview deployment logs and review retained-log access.** The source fix does not invalidate existing credentials or remove old logs. Upsun's available CLI does not expose a simple credential-rotation command; coordinate the provider-supported procedure and connection cutover rather than changing the managed database password alone. Check other environments using the former hook. Do not treat this finding as closed until rotation and a clean subsequent deployment log are verified.
2. **Resolve or explicitly assess the remaining Expo tooling advisories.** The installed SDK-compatible CLI still depends on node-forge 1.4.0 and Zod 3.25.76. [The node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) lists no patched release; npm's current node-forge version is 1.4.0. [The Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) is patched in 4.6.6, outside these consumers' Zod 3 dependency range. Forcing Zod 4 or downgrading Expo to 44 would not be a validated compatible remediation. The five audit entries include transitive dependents, not five demonstrated APK vulnerabilities. No cryptographic patch was invented and no advisory was suppressed.
3. **Set production `AUTH_ORIGIN=https://www.as-kr.com` before deploying these changes**, and explicitly leave `MOBILE_PASSWORD_LOGIN` absent or false. Set the preview origin independently. Do not inherit a production origin into preview.
4. **Isolate preview data and credentials/mail delivery.** Preview currently derives from main and inherits sensitive keys. No destructive reset or data/key migration was performed. Review the legacy plaintext email migration and offline-device data policy from the original report.
5. Deploy to preview, verify the default build and sanitized hook logs, exercise real email sign-in with a controlled mailbox, and rebuild/install the Android app before production promotion.

The original scan is preserved in `docs/security-review-2026-10-26.md`; its findings describe the pre-fix state. The pre-existing root `SECURITY_REVIEW.md` was not changed.
