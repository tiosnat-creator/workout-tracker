import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireUserId();
  redirect("/lifts");
}
