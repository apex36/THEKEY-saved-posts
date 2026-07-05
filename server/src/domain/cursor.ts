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
    if (Number.isNaN(Date.parse(ts))) return null;
    return { ts, id };
  } catch {
    return null;
  }
}
