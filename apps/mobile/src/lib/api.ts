import type { Account } from './types';
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function serverOrigin(input: string) {
  const url = new URL(input.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Enter the HTTPS address of your website, without a path.');
  }
  return url.origin;
}
export async function request<T>(origin: string, path: string, token?: string, body?: unknown, method?: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${origin}/api/mobile/v1/${path}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
      redirect: 'error',
    });
    const value = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(value?.error ?? 'The server could not complete this request.', response.status);
    if (!value) throw new Error('The server returned an invalid response.');
    return value as T;
  } finally { clearTimeout(timer); }
}
export const api = <T>(account: Account, path: string, body?: unknown, method?: string) =>
  request<T>(account.origin, path, account.token, body, method);
