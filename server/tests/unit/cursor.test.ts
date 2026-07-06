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

  it('rejects a rolled/tampered but Date.parse-able timestamp (e.g. Feb 30)', () => {
    // Date.parse('2026-02-30T00:00:00.000Z') is NOT NaN — it rolls to Mar 2.
    // A canonical-ISO round-trip check must reject it rather than page from the shift.
    const tampered = Buffer.from(JSON.stringify({ ts: '2026-02-30T00:00:00.000Z', id: 'x' })).toString('base64url');
    expect(decodeCursor(tampered)).toBeNull();
  });

  it('rejects a non-canonical ISO spelling (no millis / offset form)', () => {
    for (const ts of ['2026-07-05T10:00:00Z', '2026-07-05T10:00:00.000+00:00']) {
      expect(decodeCursor(Buffer.from(JSON.stringify({ ts, id: 'x' })).toString('base64url'))).toBeNull();
    }
  });
});
