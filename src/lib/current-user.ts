import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const authDisabled = process.env.AUTH_DISABLED === "true";

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
