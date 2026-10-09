import { requireUserId } from "@/lib/roles";
import { SessionForm } from "@/components/SessionForm";

export default async function NewSessionPage() {
  await requireUserId();

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-lg font-bold tracking-tight uppercase">
        Plan session
      </h1>
      <SessionForm />
    </div>
  );
}
