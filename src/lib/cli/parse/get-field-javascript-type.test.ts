import { it, describe, expect, beforeEach } from 'vitest';
import { getFieldJavascriptType } from './get-field-javascript-type.js';
import type { DatabaseShowColumnsRow } from '../types.js';
const colInfoTemplate: DatabaseShowColumnsRow = {
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

describe('getFieldJavascriptType', () => {
  let col: DatabaseShowColumnsRow;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('is "Object" for CastType json wthout a type annotation', () => {
    expect(getFieldJavascriptType(col, 'json')).toBe('Object');
  });
  it('picks up an inline type for CastType json with a type annotation', () => {
    col.Comment = `@json({foo: number})`;
    expect(getFieldJavascriptType(col, 'json')).toBe('{foo: number}');
  });
  it('picks up an imported type for CastType json with a type annotation', () => {
    col.Comment = `@json(MyType)`;
    expect(getFieldJavascriptType(col, 'json')).toBe('MyType');
  });
  it('picks up the strings for an enum', () => {
    col.Type = `enum('a', 'b')`;
    expect(getFieldJavascriptType(col, 'enum')).toBe(`'a'|'b'`);
  });
  it('handles the probably impossible case where the enum def is empty', () => {
    col.Type = `enum()`;
    expect(getFieldJavascriptType(col, 'enum')).toBe(`string`);
  });
  it('picks up the strings for a set', () => {
    col.Type = `set('a', 'b')`;
    expect(getFieldJavascriptType(col, 'set')).toBe(`Set<'a'|'b'>`);
  });
  it('handles the probably impossible case where the set def is empty', () => {
    col.Type = `set()`;
    expect(getFieldJavascriptType(col, 'set')).toBe(`Set<string>`);
  });
  it('handles CastType "bigint"', () => {
    expect(getFieldJavascriptType(col, 'bigint')).toBe(`bigint`);
  });
  it('handles CastType "int"', () => {
    expect(getFieldJavascriptType(col, 'int')).toBe(`number`);
  });
  it('handles CastType "float"', () => {
    expect(getFieldJavascriptType(col, 'float')).toBe(`number`);
  });
  it('handles CastType "string"', () => {
    expect(getFieldJavascriptType(col, 'string')).toBe(`string`);
  });
  it('handles CastType "boolean"', () => {
    expect(getFieldJavascriptType(col, 'boolean')).toBe(`boolean`);
  });
  it('handles CastType "date"', () => {
    expect(getFieldJavascriptType(col, 'date')).toBe(`Date`);
  });
});
