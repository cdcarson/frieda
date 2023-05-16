import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import type { SchemaCastMap } from './types.js';
import {createCastFunction} from './create-cast-function.js'
import type { Field } from '@planetscale/database';
describe('createCastFunction', () => {
  let schemaCast: SchemaCastMap;
  let f: Field
  beforeEach(() => {
    schemaCast = {
      't.a': 'string',
      't.b': 'boolean'
    }
    f = {} as unknown as Field
  })
  it('null if the value is null', () => {
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, null)).toBe(null)
  })
  it('empty str if the value is empty str', () => {
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, '')).toBe('')
  })
  it('should cast using the schema ', () => {
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, 'xyz')).toBe('xyz')
    expect(fn({...f, orgTable: 't', orgName: 'b'}, '0')).toBe(false)
    expect(fn({...f, orgTable: 't', orgName: 'b'}, '1')).toBe(true)
  })
  it('bigint in schema', () => {
    schemaCast['t.a'] = 'bigint';
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, '1')).toBe(1n)
  })
  it('bigint in custom', () => {
    const fn = createCastFunction(schemaCast, {c: 'bigint'});
    expect(fn({...f, name: 'c'}, '1')).toBe(1n)
  })
  it('date in schema', () => {
    schemaCast['t.a'] = 'date';
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, new Date().toISOString())).toEqual(expect.any(Date))
  })
  it('date in custom', () => {
    const fn = createCastFunction(schemaCast, {c: 'date'});
    expect(fn({...f, name: 'c'}, new Date().toISOString())).toEqual(expect.any(Date))
  })
  it('float in schema', () => {
    schemaCast['t.a'] = 'float';
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, '1.234')).toEqual(1.234)
  })
  it('float in custom', () => {
    const fn = createCastFunction(schemaCast, {c: 'float'});
    expect(fn({...f, name: 'c'}, '1.234')).toEqual(1.234)
  })
  it('int in schema', () => {
    schemaCast['t.a'] = 'int';
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, '1.234')).toEqual(1)
  })
  it('int in custom', () => {
    const fn = createCastFunction(schemaCast, {c: 'int'});
    expect(fn({...f, name: 'c'}, '1.234')).toEqual(1)
  })
  it('json in schema', () => {
    schemaCast['t.a'] = 'json';
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, JSON.stringify({a: 8}))).toEqual({a: 8})
  })
  it('set in schema', () => {
    schemaCast['t.a'] = 'set';
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, orgTable: 't', orgName: 'a'}, 'a,b')).toEqual(expect.any(Set))
  })
  it('falls through to the default cast from planetscale', () => {
    const fn = createCastFunction(schemaCast);
    expect(fn({...f, name: 'c'}, 'a')).toEqual('a')
  })

})
