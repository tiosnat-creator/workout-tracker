import { getAndroidDownloadUrl, isApkUrl } from "@/lib/app-download";

export function AndroidDownloadLink({
  url = getAndroidDownloadUrl(),
  className = "",
}: {
  url?: string | null;
  className?: string;
}) {
  if (!url) return null;

  return (
    <a
      href={url}
      rel="noopener noreferrer"
      download={isApkUrl(url) ? "" : undefined}
      className={`inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm font-semibold hover:border-accent ${className}`}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="#3DDC84"
      >
        <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.14-.52.38.38 0 0 0-.52.14l-1.86 3.22a11.43 11.43 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.52-.14.38.38 0 0 0-.14.52L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
      </svg>
      <span>Download for Android</span>
    </a>
  );
}
