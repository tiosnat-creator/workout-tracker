"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ActionErrorCode } from "@/lib/action-errors";

async function requireUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

// Next.js masks a thrown Server Action error's message in production
// (replacing it with a generic digest), so throwing here would never reach
// the user. Redirecting with a fixed error CODE survives that masking; the
// page maps it back to display text via ACTION_ERRORS. Never put free text
// in the query param — a crafted link could otherwise spoof arbitrary
// app-styled text.
async function withUniqueNameError<T>(
  run: () => Promise<T>,
  errorCode: ActionErrorCode,
  redirectTo: string,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(`${redirectTo}?error=${errorCode}`);
    }
    throw error;
  }
}

export async function createLift(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");

  if (!name || !categoryId) {
    throw new Error("A lift name and category are required.");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new Error("Category not found.");

  await withUniqueNameError(
    () => prisma.lift.create({ data: { userId, name, categoryId } }),
    "duplicate-lift-name",
    "/admin/lifts",
  );
  revalidatePath("/admin/lifts");
  revalidatePath("/lifts");
  revalidatePath("/");
  // Explicit redirect on success too, so a stale ?error= from an earlier
  // failed submission on this same URL doesn't linger on the next render.
  redirect("/admin/lifts");
}

export async function updateLift(liftId: string, formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const archived = formData.get("archived") === "on";

  if (!name || !categoryId) {
    throw new Error("A lift name and category are required.");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new Error("Category not found.");

  await withUniqueNameError(
    () =>
      prisma.lift.updateMany({
        where: { id: liftId, userId },
        data: { name, categoryId, archived },
      }),
    "duplicate-lift-name",
    `/admin/lifts/${liftId}`,
  );
  revalidatePath("/admin/lifts");
  revalidatePath(`/admin/lifts/${liftId}`);
  revalidatePath("/lifts");
  revalidatePath(`/lifts/${liftId}`);
  revalidatePath("/");
  redirect(`/admin/lifts/${liftId}`);
}

export async function createCategory(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) throw new Error("A category name is required.");

  await withUniqueNameError(
    () => prisma.category.create({ data: { userId, name } }),
    "duplicate-category-name",
    "/admin/categories",
  );
  revalidatePath("/admin/categories");
  revalidatePath("/admin/lifts");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function renameCategory(categoryId: string, formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) throw new Error("A category name is required.");

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new Error("Category not found.");
  if (category.isUncategorized) {
    throw new Error("The Uncategorized category can't be renamed.");
  }

  await withUniqueNameError(
    () => prisma.category.update({ where: { id: categoryId }, data: { name } }),
    "duplicate-category-name",
    "/admin/categories",
  );
  revalidatePath("/admin/categories");
  revalidatePath("/admin/lifts");
  revalidatePath("/lifts");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function deleteCategory(categoryId: string) {
  const userId = await requireUserId();

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new Error("Category not found.");
  if (category.isUncategorized) {
    throw new Error("The Uncategorized category can't be deleted.");
  }

  const fallback = await prisma.category.findFirst({
    where: { userId, isUncategorized: true },
  });
  if (!fallback) throw new Error("No Uncategorized category found.");

  await prisma.$transaction([
    prisma.lift.updateMany({
      where: { categoryId, userId },
      data: { categoryId: fallback.id },
    }),
    prisma.category.delete({ where: { id: categoryId } }),
  ]);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/lifts");
  revalidatePath("/lifts");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function createSession(formData: FormData) {
  const userId = await requireUserId();
  const dateValue = String(formData.get("date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const date = dateValue ? new Date(dateValue) : new Date();

  const session = await prisma.session.create({
    data: { userId, date, notes },
  });

  revalidatePath("/sessions");
  redirect(`/sessions/${session.id}`);
}

export async function deleteSession(sessionId: string) {
  const userId = await requireUserId();

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found.");

  await prisma.session.delete({ where: { id: sessionId } });
  revalidatePath("/sessions");
  revalidatePath("/");
}

export async function addSetEntry(sessionId: string, formData: FormData) {
  const userId = await requireUserId();

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found.");

  const liftId = String(formData.get("liftId") ?? "");
  const weight = Number(formData.get("weight"));
  const reps = Number(formData.get("reps"));
  const rpeRaw = formData.get("rpe");
  const rpe = rpeRaw ? Number(rpeRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!liftId || !Number.isFinite(weight) || !Number.isFinite(reps)) {
    throw new Error("A lift, weight, and reps are required.");
  }

  const lastOrder = await prisma.setEntry.count({ where: { sessionId } });

  await prisma.setEntry.create({
    data: { sessionId, liftId, weight, reps, rpe, notes, order: lastOrder },
  });

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/");
}

export async function deleteSetEntry(setEntryId: string, sessionId: string) {
  const userId = await requireUserId();

  const set = await prisma.setEntry.findFirst({
    where: { id: setEntryId, session: { userId } },
  });
  if (!set) throw new Error("Set not found.");

  await prisma.setEntry.delete({ where: { id: setEntryId } });
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/");
}

export async function updateLiftDashboardOrder(orderedLiftIds: string[]) {
  const userId = await requireUserId();

  await prisma.$transaction(
    orderedLiftIds.map((liftId, index) =>
      prisma.lift.updateMany({
        where: { id: liftId, userId },
        data: { dashboardOrder: index },
      }),
    ),
  );

  revalidatePath("/");
}

export async function updateCategoryDashboardOrder(orderedCategoryIds: string[]) {
  const userId = await requireUserId();

  await prisma.$transaction(
    orderedCategoryIds.map((categoryId, index) =>
      prisma.category.updateMany({
        where: { id: categoryId, userId },
        data: { dashboardOrder: index },
      }),
    ),
  );

  revalidatePath("/");
}

export async function addManualOneRepMax(liftId: string, formData: FormData) {
  const userId = await requireUserId();

  const lift = await prisma.lift.findFirst({ where: { id: liftId, userId } });
  if (!lift) throw new Error("Lift not found.");

  const weight = Number(formData.get("weight"));
  const dateValue = String(formData.get("date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!Number.isFinite(weight) || !dateValue) {
    throw new Error("A weight and date are required.");
  }

  await prisma.oneRepMaxEntry.create({
    data: { userId, liftId, weight, date: new Date(dateValue), notes },
  });

  revalidatePath(`/lifts/${liftId}`);
  revalidatePath("/");
}

export async function addBodyWeightEntry(formData: FormData) {
  const userId = await requireUserId();

  const weight = Number(formData.get("weight"));
  const dateValue = String(formData.get("date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const date = new Date(dateValue);

  if (!(weight > 0) || Number.isNaN(date.getTime())) {
    throw new Error("A positive weight and a valid date are required.");
  }

  await prisma.bodyWeightEntry.create({
    data: { userId, weight, date, notes },
  });

  revalidatePath("/bodyweight");
}

export async function deleteBodyWeightEntry(entryId: string) {
  const userId = await requireUserId();

  const entry = await prisma.bodyWeightEntry.findFirst({
    where: { id: entryId, userId },
  });
  if (!entry) throw new Error("Entry not found.");

  await prisma.bodyWeightEntry.delete({ where: { id: entryId } });
  revalidatePath("/bodyweight");
}
