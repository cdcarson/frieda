import { describe, it, expect, beforeEach } from 'vitest';
import type { ColumnRow } from './shared.js';
import { Field } from './field.js';
import { MYSQL_TYPES } from '$lib/index.js';

describe('Field', () => {
  let column: ColumnRow;
  beforeEach(() => {
    column = {
      Collation: '',
      Comment: '',
      Default: null,
      Extra: '',
      Field: '',
      Key: '',
      Null: 'NO',
      Privileges: '',
      Type: ''
    }
  })
  it('columnName', () => {
    expect(new Field({...column, Field: 'foo'}).columnName).toBe('foo')
  })
  it('fieldName', () => {
    expect(new Field({...column, Field: 'foo'}).fieldName).toBe('foo')
  })
  it('fieldName is ok if the column begins with a number', () => {
    expect(new Field({...column, Field: '3foo'}).fieldName).toBe('_3Foo')
  })

  describe('mysqlBaseType', () => {
    it('works for all the base types', () => {
      MYSQL_TYPES.forEach(t => {
        const f = new Field({...column, Type: t});
        expect(f.mysqlBaseType).toBe(t)
      })
    })
    it('works case insensitively', () => {
      MYSQL_TYPES.forEach(t => {
        const f = new Field({...column, Type: t.toUpperCase()});
        expect(f.mysqlBaseType).toBe(t)
      })
    })
    it('works if there are parenthesized args', () => {
      MYSQL_TYPES.forEach(t => {
        const f = new Field({...column, Type: `${t}(1,2)`});
        expect(f.mysqlBaseType).toBe(t)
      })
    })
    it('is null if the type is not recognized', () => {
      const f = new Field({...column, Type: `foo`});
      expect(f.mysqlBaseType).toBe(null)
    })
  })
  describe('isPrimaryKey', () => {
    it('true for PRI', () => {
      const f = new Field({...column, Key: 'PRI'});
      expect(f.isPrimaryKey).toBe(true)
    })
    it('false for UNI', () => {
      const f = new Field({...column, Key: 'UNI'});
      expect(f.isPrimaryKey).toBe(false)
    })
  })
  describe('isUnique', () => {
    it('false for PRI', () => {
      const f = new Field({...column, Key: 'PRI'});
      expect(f.isUnique).toBe(false)
    })
    it('true for UNI', () => {
      const f = new Field({...column, Key: 'UNI'});
      expect(f.isUnique).toBe(true)
    })
  })
  describe('isAutoIncrement', () => {
    it ('is true', () => {
      const f = new Field({...column, Extra: 'auto_increment'});
      expect(f.isAutoIncrement).toBe(true)
    })
  })
})