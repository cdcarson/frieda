import { it, describe, expect, beforeEach } from 'vitest';
import type { DatabaseShowColumnsRow } from '../types.js';
import { parseFieldDefinition } from './parse-field-definition.js';
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

describe('parseFieldDefinition', () => {
  let col: DatabaseShowColumnsRow;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  describe('fieldName', () => {
    it('should handle snake case', () => {
      col.Field = 'email_verified';
      expect(parseFieldDefinition(col, {}).fieldName).toBe('emailVerified');
    });
    it('should handle pascal case', () => {
      col.Field = 'EmailVerified';
      expect(parseFieldDefinition(col, {}).fieldName).toBe('emailVerified');
    });
    it('should not change camel case', () => {
      col.Field = 'emailVerified';
      expect(parseFieldDefinition(col, {}).fieldName).toBe('emailVerified');
    });
    it('should get rid of extra snake case underscores', () => {
      col.Field = 'email__verified';
      expect(parseFieldDefinition(col, {}).fieldName).toBe('emailVerified');
      col.Field = '_email_verified';
      expect(parseFieldDefinition(col, {}).fieldName).toBe('emailVerified');
      col.Field = 'email_verified____';
      expect(parseFieldDefinition(col, {}).fieldName).toBe('emailVerified');
    });
  });
  describe('isPrimaryKey', () => {
    it('is true if the Key is exactly "PRI"', () => {
      col.Key = 'PRI';
      expect(parseFieldDefinition(col, {}).isPrimaryKey).toBe(true);
    });
    it('is true if the Key is not exactly "PRI"', () => {
      col.Key = 'MUL';
      expect(parseFieldDefinition(col, {}).isPrimaryKey).toBe(false);
      col.Key = 'UNI';
      expect(parseFieldDefinition(col, {}).isPrimaryKey).toBe(false);
      col.Key = '';
      expect(parseFieldDefinition(col, {}).isPrimaryKey).toBe(false);
    });
  });
  describe('isAutoIncrement', () => {
    it('is true if Extra contains "auto_increment", case insensitively', () => {
      col.Extra = 'auto_increment';
      expect(parseFieldDefinition(col, {}).isAutoIncrement).toBe(true);
      // for completeness...
      col.Extra = 'auto_increment invisible';
      expect(parseFieldDefinition(col, {}).isAutoIncrement).toBe(true);
      col.Extra = 'invisible auto_increment';
      expect(parseFieldDefinition(col, {}).isAutoIncrement).toBe(true);
      col.Extra = 'AUTO_increment';
      expect(parseFieldDefinition(col, {}).isAutoIncrement).toBe(true);
    });
    it('is false if Extra does not match', () => {
      col.Extra = 'auto_incrementfoo';
      expect(parseFieldDefinition(col, {}).isAutoIncrement).toBe(false);
      col.Extra = 'fooauto_increment';
      expect(parseFieldDefinition(col, {}).isAutoIncrement).toBe(false);
    });
  });
  describe('isUnique', () => {
    it('is true if the Key is exactly "UNI"', () => {
      col.Key = 'UNI';
      expect(parseFieldDefinition(col, {}).isUnique).toBe(true);
    });
    it('is true if the Key is not exactly "UNI"', () => {
      col.Key = 'MUL';
      expect(parseFieldDefinition(col, {}).isUnique).toBe(false);
      col.Key = 'PRI';
      expect(parseFieldDefinition(col, {}).isUnique).toBe(false);
      col.Key = '';
      expect(parseFieldDefinition(col, {}).isUnique).toBe(false);
    });
  });
  describe('isAlwaysGenerated', () => {
    it('is true if col.Extra contains "VIRTUAL GENERATED" case insensitvely', () => {
      col.Extra = 'VIRTUAL GENERATED';
      expect(parseFieldDefinition(col, {}).isAlwaysGenerated).toBe(true);
      col.Extra = 'vIRTUAL gENERATED';
      expect(parseFieldDefinition(col, {}).isAlwaysGenerated).toBe(true);
    });
    it('is true if col.Extra contains "STORED GENERATED" case insensitvely', () => {
      col.Extra = 'STORED GENERATED';
      expect(parseFieldDefinition(col, {}).isAlwaysGenerated).toBe(true);
      col.Extra = 'STOREd gENERATED';
      expect(parseFieldDefinition(col, {}).isAlwaysGenerated).toBe(true);
    });
    it('is false if col.Extra is  "DEFAULT_GENERATED"', () => {
      col.Extra = 'DEFAULT_GENERATED';
      expect(parseFieldDefinition(col, {}).isAlwaysGenerated).toBe(false);
    });
  });
  describe('isDefaultGenerated', () => {
    it('is true for these col.Extra strings', () => {
      [
        'DEFAULT_GENERATED',
        'DEFAULT_GENERATED on update CURRENT_TIMESTAMP(3)'
      ].forEach((s) => {
        col.Extra = s;
        expect(parseFieldDefinition(col, {}).isDefaultGenerated).toBe(true);
      });
    });
    it('is false for "STORED GENERATED"', () => {
      col.Extra = 'STORED GENERATED';
      expect(parseFieldDefinition(col, {}).isDefaultGenerated).toBe(false);
    });
  });
  describe('isInvisible', () => {
    it('is true if col.Extra contains "INVISIBLE"', () => {
      ['INVISIBLE', 'INVISIBLE foo', 'INVISIBLe'].forEach((s) => {
        col.Extra = s;
        expect(parseFieldDefinition(col, {}).isInvisible).toBe(true);
      });
    });
    it('is false if col.Extra does not "INVISIBLE"', () => {
      ['INVISIBLEX'].forEach((s) => {
        col.Extra = s;
        expect(parseFieldDefinition(col, {}).isInvisible).toBe(false);
      });
    });
  });
  describe('isNullable', () => {
    it('is true if col.Null === "YES"', () => {
      col.Null = 'YES';
      expect(parseFieldDefinition(col, {}).isNullable).toBe(true);
    });
    it('is false if col.Null === "NO" ', () => {
      col.Null = 'NO';
      expect(parseFieldDefinition(col, {}).isNullable).toBe(false);
    });
  });
  describe('hasDefault', () => {
    it('is true if col.Default is a string and col.Null = NO', () => {
      col.Default = '1';
      col.Null = 'NO';
      expect(parseFieldDefinition(col, {}).hasDefault).toBe(true);
    });
    it('is true if col.Default is a string and col.Null = YES', () => {
      col.Default = '1';
      col.Null = 'YES';
      expect(parseFieldDefinition(col, {}).hasDefault).toBe(true);
    });
    it('is true if col.Default is null and col.Null = YES', () => {
      col.Default = null;
      col.Null = 'YES';
      expect(parseFieldDefinition(col, {}).hasDefault).toBe(true);
    });
    it('is false if col.Default is null and col.Null = NO', () => {
      col.Default = null;
      col.Null = 'NO';
      expect(parseFieldDefinition(col, {}).hasDefault).toBe(false);
    });
  });
});
