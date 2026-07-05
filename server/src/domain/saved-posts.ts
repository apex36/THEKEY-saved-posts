/**
 * Business rules for the bookmark lifecycle. Pure: no I/O, no clock, no imports.
 * The persistence layer supplies the current row (or null); these functions
 * decide the transition. This keeps idempotency, reactivation, and count
 * behaviour testable without a database.
 */
export type SaveAction = 'create' | 'reactivate' | 'noop';
export type UnsaveAction = 'softDelete' | 'noop';

export interface SaveSnapshot {
  deletedAt: Date | null;
}

/** Saving is idempotent: an active save is a strict no-op (no count change, no savedAt bump). */
export function decideSave(existing: SaveSnapshot | null): SaveAction {
  if (existing === null) return 'create';
  return existing.deletedAt === null ? 'noop' : 'reactivate';
}

/** Un-saving mirrors it: only an active save transitions; anything else is a no-op. */
export function decideUnsave(existing: SaveSnapshot | null): UnsaveAction {
  return existing !== null && existing.deletedAt === null ? 'softDelete' : 'noop';
}
