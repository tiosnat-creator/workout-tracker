import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSessionUser } from "@/lib/session";

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.onboardingCompletedAt ? user.id : null;
}

// Real enforcement, not just a UI hint — proxy.ts only does an optimistic
// cookie-presence check, so every action/page that needs a signed-in user
// calls this rather than trusting that proxy already handled it.
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboardingCompletedAt) redirect("/signup/profile");
  return user.id;
}

function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

export async function requireAdmin(): Promise<{ id: string; role: Role }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboardingCompletedAt) redirect("/signup/profile");
  if (!hasRole(user.role, ["OWNER", "ADMIN"])) redirect("/");
  return user;
}

export async function requireOwner(): Promise<{ id: string; role: Role }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.onboardingCompletedAt) redirect("/signup/profile");
  if (!hasRole(user.role, ["OWNER"])) redirect("/");
  return user;
}
