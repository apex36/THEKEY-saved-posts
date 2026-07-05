/**
 * Typed API client: Eden Treaty over the server's exported App type — the
 * whole REST surface is type-checked end to end. Injects the stubbed identity
 * header on every request and unwraps Treaty's {data, error} into
 * throw-on-error, which is what React Query expects.
 */
import { treaty } from '@elysiajs/eden';
import type { App } from '@app/server';
import { getCurrentUserId } from './current-user';

const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const api = treaty<App>(baseUrl, {
  headers: () => ({ 'x-user-id': getCurrentUserId() }),
});

export class ApiClientError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

export function unwrap<T>(res: {
  data: T | null;
  error: { status: number; value: unknown } | null;
}): T {
  if (res.error) {
    const value = res.error.value as { code?: string } | null;
    throw new ApiClientError(res.error.status, value?.code ?? 'generic');
  }
  return res.data as T;
}

export function getApiErrorCode(error: unknown): string {
  return error instanceof ApiClientError ? error.code : 'generic';
}
