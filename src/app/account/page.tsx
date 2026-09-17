import { requireUserId } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { decryptEmail } from "@/lib/email-crypto";
import { logout, logoutEverywhere } from "@/lib/auth-actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { emailCiphertext: true, role: true, name: true, gender: true },
  });

  const email = user.emailCiphertext ? decryptEmail(user.emailCiphertext) : null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">Account</h1>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Username</dt><dd>{user.name ?? "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Gender</dt><dd>{user.gender === "MALE" ? "Male" : user.gender === "FEMALE" ? "Female" : "—"}</dd></div>
        <div className="flex justify-between">
          <dt className="text-muted">Email</dt>
          <dd>{email ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Role</dt>
          <dd className="capitalize">{user.role.toLowerCase()}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2">
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded border border-border px-3 py-2 text-sm hover:border-accent"
          >
            Log out
          </button>
        </form>
        <ConfirmSubmitButton
          action={logoutEverywhere}
          confirmMessage="Log out of all devices? You'll need to sign in again everywhere."
          label="Log out of all devices"
          className="w-full rounded border border-border px-3 py-2 text-sm text-red-600 hover:border-red-600"
        />
      </div>
    </div>
  );
}
