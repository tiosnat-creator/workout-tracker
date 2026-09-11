// Single source of truth for the AUTH_DISABLED preview escape hatch, used by
// both proxy.ts and current-user.ts so they can never drift out of sync.
//
// Fail-safe by design: this is an allow-list (must equal "development"), not
// a deny-list of "production". If PLATFORM_ENVIRONMENT_TYPE is ever unset —
// a non-Upsun host, a local production build — auth stays ON.
export function isAuthDisabled() {
  return (
    process.env.AUTH_DISABLED === "true" &&
    process.env.PLATFORM_ENVIRONMENT_TYPE === "development"
  );
}
