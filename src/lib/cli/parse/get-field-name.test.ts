import { describe, it, expect } from 'vitest';
import { getFieldName } from './get-field-name.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';
describe('getFieldName', () => {
  it('camelCase', () => {
    expect(getFieldName({ Field: 'user_email' } as DatabaseShowFullColumnsRow)).toBe('userEmail');
    expect(getFieldName({ Field: 'UserEmail' } as DatabaseShowFullColumnsRow)).toBe('userEmail');
  });
});

