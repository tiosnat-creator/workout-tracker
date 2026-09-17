import Link from "next/link";
import { requestSignupLink } from "@/lib/auth-actions";
import { actionErrorMessage } from "@/lib/action-errors";
import { ErrorBanner } from "@/components/ErrorBanner";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error, sent } = await searchParams;
  const errorCode = Array.isArray(error) ? error[0] : error;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 pt-12">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Step 1 of 2</p>
        <h1 className="text-xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-muted">Verify your email, then tell us a little about yourself.</p>
      </div>
      <ErrorBanner message={actionErrorMessage(errorCode)} />
      {sent ? (
        <p role="status" className="text-sm text-muted">If that address can sign up, a link is on its way. Check your inbox and follow the link within 15 minutes to continue. Already registered? The link will take you to your account.</p>
      ) : (
        <form action={requestSignupLink} className="flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <button type="submit" className="rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">Send signup link</button>
        </form>
      )}
      <p className="text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-accent underline">Log in</Link></p>
    </div>
  );
}
