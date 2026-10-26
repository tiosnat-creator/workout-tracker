import { ValidationError } from '../../../packages/shared/mobile';
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function readJson(request: Request, limit = 100_000): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ValidationError('Expected JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ValidationError('Missing request body.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); throw new ValidationError('Request too large.'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('Invalid JSON.');
  } finally { reader.releaseLock(); }
}
