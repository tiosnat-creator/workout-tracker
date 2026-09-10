"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { LiftCategory } from "@prisma/client";

async function requireUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

export async function createLift(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as LiftCategory;

  if (!name || !Object.values(LiftCategory).includes(category)) {
    throw new Error("A lift name and valid category are required.");
  }

  await prisma.lift.create({ data: { userId, name, category } });
  revalidatePath("/lifts");
}

export async function updateLift(liftId: string, formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as LiftCategory;
  const archived = formData.get("archived") === "on";

  if (!name || !Object.values(LiftCategory).includes(category)) {
    throw new Error("A lift name and valid category are required.");
  }

  await prisma.lift.updateMany({
    where: { id: liftId, userId },
    data: { name, category, archived },
  });
  revalidatePath("/lifts");
  revalidatePath(`/lifts/${liftId}`);
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
