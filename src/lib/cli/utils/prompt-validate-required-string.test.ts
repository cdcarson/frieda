import { describe, it, expect } from 'vitest';
import { promptValidateRequiredString } from './prompt-validate-required-string.js';
describe('', () => {
  it('works', () => {
    const p = promptValidateRequiredString as unknown as (
      s: string
    ) => string | true;
    expect(p(' ')).toBe('Required.');
    expect(p('')).toBe('Required.');
    expect(p(' foo')).toBe(true);
  });
});
