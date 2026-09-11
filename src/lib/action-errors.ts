// Fixed catalog of action-error codes carried in a redirect's ?error= query
// param. Never put free text there — only a known code from this catalog may
// be rendered, so a crafted link can't spoof arbitrary app-styled text.
const ACTION_ERROR_ENTRIES = [
  ["duplicate-lift-name", "You already have a lift with that name."],
  ["duplicate-category-name", "You already have a category with that name."],
] as const;

export type ActionErrorCode = (typeof ACTION_ERROR_ENTRIES)[number][0];

// A Map (not a plain object) so a code like "__proto__" or "toString" can
// never resolve to an inherited member instead of undefined.
const ACTION_ERRORS = new Map<string, string>(ACTION_ERROR_ENTRIES);

export function actionErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return ACTION_ERRORS.get(code);
}
