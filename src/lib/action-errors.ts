// Fixed catalog of action-error codes carried in a redirect's ?error= query
// param. Never put free text there — only a known code from this map may be
// rendered, so a crafted link can't spoof arbitrary app-styled text.
export const ACTION_ERRORS = {
  "duplicate-lift-name": "You already have a lift with that name.",
  "duplicate-category-name": "You already have a category with that name.",
} as const;

export type ActionErrorCode = keyof typeof ACTION_ERRORS;

export function actionErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return ACTION_ERRORS[code as ActionErrorCode];
}
