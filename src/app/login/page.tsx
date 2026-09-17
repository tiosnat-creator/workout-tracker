import { requestMagicLink } from "@/lib/auth-actions";
import { actionErrorMessage } from "@/lib/action-errors";
import { ErrorBanner } from "@/components/ErrorBanner";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { error, sent } = await searchParams;
  const errorCode = Array.isArray(error) ? error[0] : error;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 pt-12">
      <h1 className="text-lg font-bold tracking-tight uppercase">Sign in</h1>
      <ErrorBanner message={actionErrorMessage(errorCode)} />
      {sent ? (
        <p className="text-sm text-muted">
          If that address can sign in, a link is on its way — check your
          inbox. The link expires in 15 minutes and can only be used once.
        </p>
      ) : (
        <form action={requestMagicLink} className="flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
          >
            Send magic link
          </button>
        </form>
      )}
    </div>
  );
}
