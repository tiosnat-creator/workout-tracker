import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Belt-and-braces: even if AUTH_DISABLED is ever set on the production
// environment by mistake, refuse to honor it there. Upsun always sets
// PLATFORM_ENVIRONMENT_TYPE to "production" on the live environment.
const authDisabled =
  process.env.AUTH_DISABLED === "true" &&
  process.env.PLATFORM_ENVIRONMENT_TYPE !== "production";

export async function getCurrentUserId(): Promise<string | null> {
  if (authDisabled) {
    const user = await prisma.user.findFirst({ select: { id: true } });
    return user?.id ?? null;
  }

  const session = await auth();
  return session?.user?.id ?? null;
}

export function isAuthDisabled() {
  return authDisabled;
}
