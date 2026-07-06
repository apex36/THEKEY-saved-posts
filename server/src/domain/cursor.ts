/** Opaque keyset-pagination cursor. Pure: no I/O. */
export interface Cursor {
  /** ISO-8601 timestamp — createdAt for feeds, savedAt for saved lists. */
  ts: string;
  /** Row id — total-order tiebreaker for equal timestamps. */
  id: string;
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

/** Returns null for anything that is not a well-formed cursor (tampered, truncated, wrong shape). */
export function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { ts, id } = parsed as Record<string, unknown>;
    if (typeof ts !== 'string' || typeof id !== 'string') return null;
    // Accept only canonical ISO-8601 as produced by Date.toISOString(). Date.parse
    // is lenient — it rolls '2026-02-30T…' forward to Mar 2 instead of rejecting it —
    // so a tampered/rolled cursor would otherwise pass and resume paging from a
    // shifted point. Round-tripping through toISOString() rejects anything a real
    // cursor (always encoded from toISOString()) would never have produced.
    const when = new Date(ts);
    if (Number.isNaN(when.getTime()) || when.toISOString() !== ts) return null;
    return { ts, id };
  } catch {
    return null;
  }
}
