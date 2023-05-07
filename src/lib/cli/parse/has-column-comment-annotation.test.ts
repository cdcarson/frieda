import { it, describe, expect } from 'vitest';
import type { DatabaseShowColumnsRow } from '../types.js';
import { hasColumnCommentAnnotation } from './has-column-comment-annotation.js';

describe('hasColumnCommentAnnotation', () => {
  it('should be true if the column comment matches', () => {
    const column: DatabaseShowColumnsRow = {
      Comment: '@foo'
    } as DatabaseShowColumnsRow;
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
    column.Comment = '@bar @foo';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it('should be true if the column comment matches, with args', () => {
    const column: DatabaseShowColumnsRow = {
      Comment: '@foo(something)'
    } as DatabaseShowColumnsRow;
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
    column.Comment = '@foo ( something)';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it('should be case insensitive', () => {
    const column: DatabaseShowColumnsRow = {
      Comment: '@FoO'
    } as DatabaseShowColumnsRow;
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it("should be false if the column comment doesn't match", () => {
    const column: DatabaseShowColumnsRow = {
      Comment: '@foo'
    } as DatabaseShowColumnsRow;
    expect(hasColumnCommentAnnotation('bar', column)).toBe(false);
    column.Comment = '@bar@foo';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(false);
    column.Comment = '@foobar';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(false);
    column.Comment = '@foo@bar';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(false);
  });
});
