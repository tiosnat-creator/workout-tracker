import { cache } from "react";
import { prisma } from "@/lib/prisma";

// No per-user login anymore — access is gated entirely at the HTTP layer
// (Upsun's basic-auth site gate; see .upsun/config.yaml / README). This app
// is single-tenant: "current user" is the account seed.ts maintains at
// SEED_USER_EMAIL, resolved by that same identifier rather than "oldest
// row" so that changing SEED_USER_EMAIL can't silently strand data under an
// account nothing points at anymore.
//
// Wrapped in React's cache() so the handful of calls per request (root
// layout + the page itself) share one DB round-trip instead of issuing it
// repeatedly for a value that never changes within a request.
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const email = process.env.SEED_USER_EMAIL;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return user?.id ?? null;
});
