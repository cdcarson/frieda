import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldJavascriptType } from './get-field-javascript-type.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';
import type { TypeOptions } from '../../api/types.js';


describe('getFieldJavascriptType', () => {
  let col: DatabaseShowFullColumnsRow;
  let options: Partial<TypeOptions>
  beforeEach(() => {
    col = {
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
    options = {
      typeBigIntAsString: true,
      typeTinyIntOneAsBoolean: true
    }
  });
  it('is "Object" for json wthout a type annotation', () => {
    col.Type = 'json'
    expect(getFieldJavascriptType(col, options)).toBe('Object');
  });
  it('picks up an inline type for CastType json with a type annotation', () => {
    col.Type = 'json'
    col.Comment = `@json({foo: number})`;
    expect(getFieldJavascriptType(col, options)).toBe('{foo: number}');
  });
  it('picks up an imported type for CastType json with a type annotation', () => {
    col.Type = 'json'
    col.Comment = `@json(MyType)`;
    expect(getFieldJavascriptType(col, options)).toBe('MyType');
  });

  it(' "picks up an imported type for enum', () => {
    col.Type = `enum('a', 'b')`;
    col.Comment = '@enum(Foo)'
    expect(getFieldJavascriptType(col, options)).toBe('Foo');
  });
  it('picks up the strings for an enum', () => {
    col.Type = `enum('a', 'b')`;
    expect(getFieldJavascriptType(col, options)).toBe(`'a'|'b'`);
  });
  it('handles the probably impossible case where the enum def is empty', () => {
    col.Type = `enum()`;
    expect(getFieldJavascriptType(col, options)).toBe(`string`);
  });
  it('returns string for set by default', () => {
    col.Type = `set('a', 'b')`;
    expect(getFieldJavascriptType(col, options)).toBe(`string`);
  });
  it('picks up the strings for a set', () => {
    col.Type = `set('a', 'b')`;
    col.Comment = '@set'
    expect(getFieldJavascriptType(col, options)).toBe(`Set<'a'|'b'>`);
  });
  it('picks up the type of the @set annotation if it exists', () => {
    col.Type = `set('a', 'b')`;
    col.Comment = '@set(Foo)'
    expect(getFieldJavascriptType(col, options)).toBe(`Set<Foo>`);
  });
  it('handles the probably impossible case where the set def is empty', () => {
    col.Type = `set()`;
    col.Comment = '@set'
    expect(getFieldJavascriptType(col, options)).toBe(`Set<string>`);
  });
  it('handles "bigint"', () => {
    col.Type = 'bigint'
    col.Comment = '@bigint'
    expect(getFieldJavascriptType(col, options)).toBe(`bigint`);
  });
  it('handles  "int"', () => {
    col.Type = 'int'
    expect(getFieldJavascriptType(col, options)).toBe(`number`);
  });
  it('handles CastType "float"', () => {
    col.Type = 'double'
    expect(getFieldJavascriptType(col, options)).toBe(`number`);
  });
  it('handles text', () => {
    col.Type = 'text'
    expect(getFieldJavascriptType(col, options)).toBe(`string`);
  });
  it('handles  tinyint(1)', () => {
    col.Type = 'tinyint(1)'
    expect(getFieldJavascriptType(col, options)).toBe(`boolean`);
  });
  it('handles tinyint(1) if typeTinyIntOneAsBoolean is false', () => {
    col.Type = 'tinyint(1)'
    expect(getFieldJavascriptType(col, {typeTinyIntOneAsBoolean: false, typeBigIntAsString: true})).toBe(`number`);
  });
  it('handles datetime', () => {
    col.Type = 'datetime'
    expect(getFieldJavascriptType(col, options)).toBe(`Date`);
  });
});

