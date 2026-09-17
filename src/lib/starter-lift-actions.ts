"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/roles";
import { addStarterLifts } from "@/lib/starter-lifts";

// Explicit opt-in for customers who signed up before starter lifts were added.
export async function initializeStarterLifts() {
  const userId = await requireUserId();
  await prisma.$transaction((tx) => addStarterLifts(tx, userId));
  revalidatePath("/", "layout");
  redirect("/lifts");
}
