import { describe, expect, it } from 'vitest';
import { smoke } from '../../src/smoke.test-support';

describe('toolchain smoke', () => {
  it('runs vitest against server sources', () => {
    expect(smoke()).toBe('ok');
  });
});
