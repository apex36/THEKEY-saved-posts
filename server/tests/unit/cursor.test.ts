import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../../src/domain/cursor';

describe('cursor codec', () => {
  it('round-trips', () => {
    const c = { ts: '2026-07-05T10:00:00.000Z', id: '3f8a2c1e-0000-4000-8000-000000000001' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it('rejects non-base64 garbage', () => {
    expect(decodeCursor('!!not-a-cursor!!')).toBeNull();
  });

  it('rejects valid base64 of the wrong shape', () => {
    expect(decodeCursor(Buffer.from(JSON.stringify({ nope: 1 })).toString('base64url'))).toBeNull();
  });

  it('rejects a non-ISO timestamp', () => {
    expect(decodeCursor(Buffer.from(JSON.stringify({ ts: 'yesterday', id: 'x' })).toString('base64url'))).toBeNull();
  });
});
