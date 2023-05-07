import { describe, it, expect } from 'vitest';
import { validateDatabaseUrl } from './validate-database-url.js';
describe('validateDatabaseUrl', () => {
  const good = [`mysql://u:p@aws.connect.psdb.cloud`, `mysql://u:p@h`];
  const bad = [
    new Date(),
    `u:p@aws.connect.psdb.cloud`,
    `mysql://u:p@`,
    `mysql://u:@aws.connect.psdb.cloud`,
    'mysql://:p@aws.connect.psdb.cloud'
  ];
  it('is true for good ones', () => {
    good.forEach((s) => {
      expect(validateDatabaseUrl(s)).toBe(true);
    });
  });
  it('is false for bad ones', () => {
    bad.forEach((s) => {
      expect(validateDatabaseUrl(s)).toBe(false);
    });
  });
});
