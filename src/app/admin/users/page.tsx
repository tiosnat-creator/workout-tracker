import { requireAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { decryptEmail } from "@/lib/email-crypto";
import { promoteToAdmin, demoteToMember, setUserDisabled } from "@/lib/admin-actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import { actionErrorMessage } from "@/lib/action-errors";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const viewer = await requireAdmin();
  const { error } = await searchParams;
  const errorCode = Array.isArray(error) ? error[0] : error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      emailCiphertext: true,
      role: true,
      disabledAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold tracking-tight uppercase">Users</h1>
      <ErrorBanner message={actionErrorMessage(errorCode)} />
      <div className="flex flex-col divide-y divide-border rounded border border-border bg-surface">
        {users.map((user) => {
          const email = user.emailCiphertext
            ? decryptEmail(user.emailCiphertext)
            : "—";
          const isSelf = user.id === viewer.id;
          const isOwner = user.role === "OWNER";

          return (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {email}
                  {isSelf && (
                    <span className="ml-2 text-xs text-muted">(you)</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {user.role.toLowerCase()}
                  {user.disabledAt && " · disabled"}
                  {user.lastLoginAt &&
                    ` · last login ${formatDate(user.lastLoginAt)}`}
                </p>
              </div>
              {!isOwner && (
                <div className="flex flex-wrap items-center gap-2">
                  {viewer.role === "OWNER" &&
                    (user.role === "ADMIN" ? (
                      <ConfirmSubmitButton
                        action={demoteToMember.bind(null, user.id)}
                        confirmMessage={`Remove admin from ${email}?`}
                        label="Remove admin"
                        className="text-xs text-muted hover:text-accent"
                      />
                    ) : (
                      <ConfirmSubmitButton
                        action={promoteToAdmin.bind(null, user.id)}
                        confirmMessage={`Make ${email} an admin?`}
                        label="Make admin"
                        className="text-xs text-muted hover:text-accent"
                      />
                    ))}
                  {!isSelf &&
                    (user.disabledAt ? (
                      <ConfirmSubmitButton
                        action={setUserDisabled.bind(null, user.id, false)}
                        confirmMessage={`Re-enable ${email}?`}
                        label="Enable"
                        className="text-xs text-muted hover:text-accent"
                      />
                    ) : (
                      <ConfirmSubmitButton
                        action={setUserDisabled.bind(null, user.id, true)}
                        confirmMessage={`Disable ${email}? They'll be signed out immediately.`}
                        label="Disable"
                        className="text-xs text-muted hover:text-red-600"
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
