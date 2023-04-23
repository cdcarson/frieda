import { describe, it, expect, should, beforeEach } from 'vitest';

import {
  getFieldCastType,
  getFieldKnownMySQLType,
  parseFieldDefinition,
  hasColumnCommentAnnotation,
  getFieldJavascriptType,
  parseModelDefinition
} from './parse.js';
import type { DatabaseColumnRow, DatabaseTableInfo } from '$lib/api/types.js';
import { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';
import { getParenthesizedArgs } from './utils.js';
const colInfoTemplate: DatabaseColumnRow = {
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
const tableInfoTemplate: DatabaseTableInfo = {
  columns: [],
  indexes: [],
  name: '',
  tableCreateStatement: ''
};

describe('parseFieldDefinition', () => {
  let col: DatabaseColumnRow;
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

describe('getFieldJavascriptType', () => {
  let col: DatabaseColumnRow;
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

describe('getFieldKnownMySQLType', () => {
  it('handles all the known types', () => {
    KNOWN_MYSQL_TYPES.forEach((s) => {
      const column = {
        ...colInfoTemplate,
        Type: s
      };
      expect(getFieldKnownMySQLType(column)).toBe(s);
    });
  });
  it('handles all the known types case-insensitively', () => {
    KNOWN_MYSQL_TYPES.forEach((s) => {
      const column = {
        ...colInfoTemplate,
        Type: s.toUpperCase()
      };
      expect(getFieldKnownMySQLType(column)).toBe(s);
    });
  });
  it('handles all the known types if they have parethesized args', () => {
    KNOWN_MYSQL_TYPES.forEach((s) => {
      const column = {
        ...colInfoTemplate,
        Type: `${s}(foo)`
      };
      expect(getFieldKnownMySQLType(column)).toBe(s);
    });
  });
  it('is null for an unkown type', () => {
    const column = {
      ...colInfoTemplate,
      Type: 'foobar'
    };
    expect(getFieldKnownMySQLType(column)).toBe(null);
  });
});

describe('getFieldCastType', () => {
  let col: DatabaseColumnRow;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('should be string for null', () => {
    expect(getFieldCastType(col, null, {})).toBe('string');
  });
  it('should be json for json col', () => {
    expect(getFieldCastType(col, 'json', {})).toBe('json');
  });
  it('should be string for bigint by default', () => {
    expect(getFieldCastType(col, 'bigint', {})).toBe('string');
  });
  it('should be bigint for bigint if the type casting is turned off', () => {
    expect(getFieldCastType(col, 'bigint', { typeBigIntAsString: false })).toBe(
      'bigint'
    );
  });
  it('should be bigint for bigint if the @bigint annotation exists', () => {
    col.Comment = '@bigint';
    expect(getFieldCastType(col, 'bigint', {})).toBe('bigint');
    col.Comment = '@BIGint';
    expect(getFieldCastType(col, 'bigint', {})).toBe('bigint');
    col.Comment = ' @bigint oh lets try this';
    expect(getFieldCastType(col, 'bigint', {})).toBe('bigint');
  });
  it('should be boolean for tinyint(1) by default', () => {
    col.Type = 'tinyint(1)';
    expect(getParenthesizedArgs(col.Type, 'tinyint')).toBe('1');
    expect(getFieldCastType(col, 'tinyint', {})).toBe('boolean');
    col.Type = 'tinYint(  1 )';
    expect(getFieldCastType(col, 'tinyint', {})).toBe('boolean');
  });
  it('should be int for tinyint(1) if the default type cast is turned off', () => {
    col.Type = 'tinyint(1)';
    expect(
      getFieldCastType(col, 'tinyint', { typeTinyIntOneAsBoolean: false })
    ).toBe('int');
  });
  it('should be int for all other int-y types', () => {
    const intTypes: (typeof KNOWN_MYSQL_TYPES)[number][] = [
      'tinyint',
      'int',
      'integer',
      'smallint',
      'mediumint'
    ];
    intTypes.forEach((t) => {
      expect(getFieldCastType(col, t, {})).toBe('int');
    });
  });
  it('should be float for the float-y types', () => {
    const ft: (typeof KNOWN_MYSQL_TYPES)[number][] = [
      'float',
      'double',
      'real',
      'decimal',
      'numeric'
    ];
    ft.forEach((t) => {
      expect(getFieldCastType(col, t, {})).toBe('float');
    });
  });
  it('should be date for the date types', () => {
    const types: (typeof KNOWN_MYSQL_TYPES)[number][] = [
      'date',
      'datetime',
      'timestamp'
    ];
    types.forEach((t) => {
      expect(getFieldCastType(col, t, {})).toBe('date');
    });
  });
  it('should be set for set', () => {
    expect(getFieldCastType(col, 'set', {})).toBe('set');
  });
  it('should be enum for enum', () => {
    expect(getFieldCastType(col, 'enum', {})).toBe('enum');
  });
  it('should be int for year', () => {
    expect(getFieldCastType(col, 'year', {})).toBe('int');
  });
  it('should be string for time', () => {
    expect(getFieldCastType(col, 'time', {})).toBe('string');
  });
  it('should be string for all the string-y types', () => {
    const types: (typeof KNOWN_MYSQL_TYPES)[number][] = [
      'bit',
      'binary',
      'char',
      'varchar',
      'varbinary',
      'tinyblob',
      'tinytext',
      'blob',
      'text',
      'mediumblob',
      'mediumtext',
      'longblob',
      'longtext'
    ];
    types.forEach((t) => {
      expect(getFieldCastType(col, t, {})).toBe('string');
    });
  });
});

describe('hasColumnCommentAnnotation', () => {
  it('should be true if the column comment matches', () => {
    const column: DatabaseColumnRow = {
      ...colInfoTemplate,
      Comment: '@foo'
    };
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
    column.Comment = '@bar @foo';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it('should be true if the column comment matches, with args', () => {
    const column: DatabaseColumnRow = {
      ...colInfoTemplate,
      Comment: '@foo(something)'
    };
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
    column.Comment = '@foo ( something)';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it('should be case insensitive', () => {
    const column: DatabaseColumnRow = {
      ...colInfoTemplate,
      Comment: '@FoO'
    };
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it("should be false if the column comment doesn't match", () => {
    const column: DatabaseColumnRow = {
      ...colInfoTemplate,
      Comment: '@foo'
    };
    expect(hasColumnCommentAnnotation('bar', column)).toBe(false);
    column.Comment = '@bar@foo';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(false);
    column.Comment = '@foobar';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(false);
    column.Comment = '@foo@bar';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(
      /**should be false */ false
    );
  });
});

describe('parseModelDefinition', () => {
  let tableInfo: DatabaseTableInfo;
  beforeEach(() => {
    tableInfo = { ...tableInfoTemplate };
  });
  describe('modelName', () => {
    it('is PascalCase', () => {
      tableInfo.name = 'user_account';
      expect(parseModelDefinition(tableInfo, {}).modelName).toBe('UserAccount');
      tableInfo.name = 'UserAccount';
      expect(parseModelDefinition(tableInfo, {}).modelName).toBe('UserAccount');
    });
  });
  describe('other names', () => {
    it('all of them should be like this', () => {
      tableInfo.name = 'user_account';
      expect(parseModelDefinition(tableInfo, {}).modelPrimaryKeyTypeName).toBe(
        'UserAccountPrimaryKey'
      );
      expect(parseModelDefinition(tableInfo, {}).modelCreateDataTypeName).toBe(
        'UserAccountCreateData'
      );
      expect(parseModelDefinition(tableInfo, {}).modelUpdateDataTypeName).toBe(
        'UserAccountUpdateData'
      );
      expect(
        parseModelDefinition(tableInfo, {}).modelFindUniqueParamsTypeName
      ).toBe('UserAccountFindUniqueParams');
      expect(parseModelDefinition(tableInfo, {}).modelDefinitionConstName).toBe(
        'userAccountModelDefinition'
      );
      expect(parseModelDefinition(tableInfo, {}).classRepoName).toBe(
        'userAccount'
      );
    });
  });
});
