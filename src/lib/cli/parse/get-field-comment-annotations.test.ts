import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldCommentAnnotations } from './get-field-comment-annotations.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';



describe('getFieldCommentAnnotations', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Comment: '',
      Default: '',
      Extra: '',
      Field: '',
      Key: '',
      Null: 'NO',
      Type: '',
      Collation: null,
      Privileges: ''
    };
  });

  it('bigint', () => {
    column.Comment = '@bigint';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'bigint'
    });
    column.Comment = '@BigInt';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'bigint'
    });
  });
  it('enum', () => {
    column.Comment = '@enum';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum'
    });
    column.Comment = '@ENUM';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum'
    });
    column.Comment = '@enum(MyType';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum'
    });
    column.Comment = '@enum(MyType)';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum',
      argument: 'MyType'
    });
  });

  it('set', () => {
    column.Comment = '@set';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set'
    });
    column.Comment = '@Set';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set'
    });
    column.Comment = '@set(MyType';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set'
    });
    column.Comment = '@set(MyType)';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set',
      argument: 'MyType'
    });
  });
  it('json', () => {
    column.Comment = '@json';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json'
    });
    column.Comment = '@Json';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json'
    });
    column.Comment = '@json(MyType';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json'
    });
    column.Comment = '@json(MyType)';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json',
      argument: 'MyType'
    });
  });
  it('other situations', () => {
    column.Comment = '@foobar';
    let result = getFieldCommentAnnotations(column);
    expect(result.length).toBe(0);
    column.Comment = '@foobar @bigint';
    result = getFieldCommentAnnotations(column);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      annotation: 'bigint'
    });
  });
});
