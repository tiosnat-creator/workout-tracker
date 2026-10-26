import { redirect } from "next/navigation";
import { consumeMagicLink } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

// A confirm-page-then-POST flow rather than consuming the token on a bare
// GET: corporate email scanners (Outlook Safe Links, Defender, etc.)
// pre-fetch links found in emails, which would silently burn a single-use
// token before the real person ever clicks it.
export default async function VerifyLoginPage({
  searchParams,
}: PageProps<"/login/verify">) {
  const { token } = await searchParams;
  const tokenValue = Array.isArray(token) ? token[0] : token;

  if (!tokenValue) {
    redirect("/login?error=invalid-link");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 pt-12 text-center">
      <h1 className="text-lg font-bold tracking-tight uppercase">
        Confirm sign-in
      </h1>
      <p className="text-sm text-muted">
        Click continue to finish signing in to Lifting Log.
      </p>
      <form action={consumeMagicLink.bind(null, tokenValue)}>
        <button
          type="submit"
          className="w-full rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
