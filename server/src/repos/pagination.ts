import { encodeCursor, type Cursor } from '../domain/cursor';
import type { Page } from './types';

/**
 * Assemble a keyset page from `limit + 1` fetched rows: emit the first `limit`
 * as items, and a `nextCursor` only when the extra row proves more exist.
 * Shared by both the Drizzle and in-memory repos so the two can't drift.
 */
export function toPage<Row, View>(
  rows: Row[],
  limit: number,
  toView: (row: Row) => View,
  toCursor: (row: Row) => Cursor,
): Page<View> {
  const pageRows = rows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map(toView),
    nextCursor: rows.length > limit && last !== undefined ? encodeCursor(toCursor(last)) : null,
  };
}
