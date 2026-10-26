import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { logout } from "@/lib/auth-actions";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function SignupProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/signup");
  if (user.onboardingCompletedAt) redirect("/");
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 pt-8">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Email verified · Step 2 of 2</p>
      <div>
        <h1 className="text-xl font-bold">Complete your profile</h1>
        <p className="mt-2 text-sm text-muted">A few details to get your training log started.</p>
      </div>
      <ProfileForm />
      <form action={logout} className="text-center">
        <button className="text-sm text-muted underline">Sign out and finish later</button>
      </form>
    </div>
  );
}
