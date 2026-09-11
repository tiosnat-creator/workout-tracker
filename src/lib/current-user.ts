import { prisma } from "@/lib/prisma";

// No per-user login anymore — access is gated entirely at the HTTP layer
// (Upsun's basic-auth site gate). This app is single-tenant, so "current
// user" is just the one seeded account.
export async function getCurrentUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return user?.id ?? null;
}
