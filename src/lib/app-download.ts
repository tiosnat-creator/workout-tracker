// Public download target for the Android app (an APK or a store listing).
// Read per request from the server environment so each Upsun environment can
// point at its own build without a rebuild. Missing or non-HTTPS values fail
// closed: the download button is simply not rendered.
export function getAndroidDownloadUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.ANDROID_APP_DOWNLOAD_URL?.trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return raw;
}

export function isApkUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".apk");
  } catch {
    return false;
  }
}
