import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUserSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.userSession.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Wrapped in React's cache() so the several calls per request (layout, the
// page itself, any admin/role checks) share one DB round-trip rather than
// re-querying for a value that never changes within a request — mirrors
// the pattern the old single-tenant getCurrentUserId() used.
export const getSessionUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const record = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, role: true, disabledAt: true } },
    },
  });

  if (!record) return null;

  if (record.expiresAt < new Date()) {
    await prisma.userSession.delete({ where: { id: record.id } }).catch(() => {});
    return null;
  }

  // A disabled account's sessions are also deleted eagerly by
  // setUserDisabled(), but this check is a belt-and-suspenders backstop for
  // any session that predates a disable action.
  if (record.user.disabledAt) return null;

  return record.user;
});

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);
  if (!token) return;

  await prisma.userSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.userSession.deleteMany({ where: { userId } });
}
