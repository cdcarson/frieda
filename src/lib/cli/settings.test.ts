import { describe, it, expect, beforeEach, type SpyInstance, vi } from 'vitest';
import { isValidDatabaseURL } from './settings.js';
describe('isValidDatabaseURL', () => {
  const good = [`mysql://u:p@aws.connect.psdb.cloud`, `mysql://u:p@h`];
  const bad = [
    `u:p@aws.connect.psdb.cloud`,
    `mysql://u:p@`,
    `mysql://u:@aws.connect.psdb.cloud`,
    'mysql://:p@aws.connect.psdb.cloud'
  ];
  it('is true for good ones', () => {
    good.forEach((s) => {
      expect(isValidDatabaseURL(s)).toBe(true);
    });
  });
  it('is false for bad ones', () => {
    bad.forEach((s) => {
      expect(isValidDatabaseURL(s)).toBe(false);
    });
  });
});


