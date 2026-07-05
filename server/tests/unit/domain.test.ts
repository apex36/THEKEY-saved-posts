import { describe, expect, it } from 'vitest';
import { decideSave, decideUnsave } from '../../src/domain/saved-posts';

describe('decideSave', () => {
  it('creates when never saved', () => {
    expect(decideSave(null)).toBe('create');
  });

  it('reactivates a soft-deleted save', () => {
    expect(decideSave({ deletedAt: new Date('2026-01-01') })).toBe('reactivate');
  });

  it('is a strict no-op when already actively saved (idempotency)', () => {
    expect(decideSave({ deletedAt: null })).toBe('noop');
  });
});

describe('decideUnsave', () => {
  it('soft-deletes an active save', () => {
    expect(decideUnsave({ deletedAt: null })).toBe('softDelete');
  });

  it('is a no-op when never saved', () => {
    expect(decideUnsave(null)).toBe('noop');
  });

  it('is a no-op when already un-saved', () => {
    expect(decideUnsave({ deletedAt: new Date('2026-01-01') })).toBe('noop');
  });
});
