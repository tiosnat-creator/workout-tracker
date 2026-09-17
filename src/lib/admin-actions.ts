"use server";

// User/role administration only — this module must never import the
// workout-data Prisma delegates (Lift, Category, Session, SetEntry,
// OneRepMaxEntry, BodyWeightEntry). That's what actually makes "admins
// can't see other users' workout data" true, not just an absent route.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireOwner } from "@/lib/roles";
import { destroyAllSessionsForUser } from "@/lib/session";
import type { ActionErrorCode } from "@/lib/action-errors";

function redirectWithError(code: ActionErrorCode): never {
  redirect(`/admin/users?error=${code}`);
}

export async function promoteToAdmin(userId: string) {
  const owner = await requireOwner();
  if (userId === owner.id) redirectWithError("cannot-modify-owner");

  // Re-read the target fresh rather than trusting the page's rendered
  // state — its role may have changed between render and submit.
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "OWNER") redirectWithError("cannot-modify-owner");

  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function demoteToMember(userId: string) {
  const owner = await requireOwner();
  if (userId === owner.id) redirectWithError("cannot-modify-owner");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "OWNER") redirectWithError("cannot-modify-owner");

  await prisma.user.update({ where: { id: userId }, data: { role: "MEMBER" } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) redirectWithError("cannot-disable-self");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "OWNER") redirectWithError("cannot-modify-owner");

  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: disabled ? new Date() : null },
  });

  // Take effect immediately rather than lazily on the target's next
  // request — don't just rely on the disabledAt check in getSessionUser().
  if (disabled) {
    await destroyAllSessionsForUser(userId);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
