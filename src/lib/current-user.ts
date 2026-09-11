import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAuthDisabled } from "@/lib/auth-disabled";

export async function getCurrentUserId(): Promise<string | null> {
  if (isAuthDisabled()) {
    const user = await prisma.user.findFirst({ select: { id: true } });
    return user?.id ?? null;
  }

  const session = await auth();
  return session?.user?.id ?? null;
}
