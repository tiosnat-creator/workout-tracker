import 'server-only';

// Configuration only: never derive emailed credentials' destinations from headers.
export function authOrigin(): string {
  const value = process.env.AUTH_ORIGIN ?? process.env.MOBILE_AUTH_ORIGIN;
  if (!value) throw new Error('AUTH_ORIGIN must be configured');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('AUTH_ORIGIN must be an HTTPS origin');
  }
  return url.origin;
}
