"use client";

export function ConfirmSubmitButton({
  action,
  confirmMessage,
  label,
  className,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label: string;
  className?: string;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={className ?? "text-xs text-muted hover:text-red-600"}
        onClick={(e) => {
          if (!confirm(confirmMessage)) {
            e.preventDefault();
          }
        }}
      >
        {label}
      </button>
    </form>
  );
}
