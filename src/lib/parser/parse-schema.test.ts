import { describe, it, expect, should, beforeEach } from 'vitest';

import {
  getFieldCastType,
  getFieldKnownMySQLType,
  parseFieldDefinition,
  hasColumnCommentAnnotation,
  getFieldJavascriptType,
  isFieldColumnPrimaryKey,
  isFieldColumnAutoIncrement,
  isFieldColumnAlwaysGenerated,
  isFieldColumnDefaultGenerated,
  isFieldColumnInvisible,
  isFieldColumnNullable
} from './parse-schema.js';
import type { DatabaseTableColumnInfo } from '$lib/types.js';
import { KNOWN_MYSQL_TYPES } from '$lib/constants.js';
import { getParenthesizedArgs } from '$lib/utils/rx-utils.js';
const colInfoTemplate: DatabaseTableColumnInfo = {
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

describe('isFieldColumnNullable', () => {
  let col: DatabaseTableColumnInfo;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('is true if col.Null === "YES"', () => {
    col.Null = 'YES';
    expect(isFieldColumnNullable(col)).toBe(true);
  });
  it('is false if col.Null === "NO" ', () => {
    col.Null = 'NO';
    expect(isFieldColumnNullable(col)).toBe(false);
  });
});

describe('isFieldColumnInvisible', () => {
  let col: DatabaseTableColumnInfo;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('is true if col.Extra contains "INVISIBLE"', () => {
    ['INVISIBLE', 'INVISIBLE foo', 'INVISIBLe'].forEach((s) => {
      col.Extra = s;
      expect(isFieldColumnInvisible(col)).toBe(true);
    });
  });
  it('is false if col.Extra does not "INVISIBLE"', () => {
    ['INVISIBLEX'].forEach((s) => {
      col.Extra = s;
      expect(isFieldColumnInvisible(col)).toBe(false);
    });
  });
});

describe('isFieldColumnDefaultGenerated', () => {
  let col: DatabaseTableColumnInfo;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('is true for these col.Extra strings', () => {
    [
      'DEFAULT_GENERATED',
      'DEFAULT_GENERATED on update CURRENT_TIMESTAMP(3)'
    ].forEach((s) => {
      col.Extra = s;
      expect(isFieldColumnDefaultGenerated(col)).toBe(true);
    });
  });
  it('is false for "STORED GENERATED"', () => {
    col.Extra = 'STORED GENERATED';
    expect(isFieldColumnDefaultGenerated(col)).toBe(false);
  });
});

describe('isFieldColumnAlwaysGenerated', () => {
  let col: DatabaseTableColumnInfo;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('is true if col.Extra contains "VIRTUAL GENERATED" case insensitvely', () => {
    col.Extra = 'VIRTUAL GENERATED';
    expect(isFieldColumnAlwaysGenerated(col)).toBe(true);
    col.Extra = 'vIRTUAL gENERATED';
    expect(isFieldColumnAlwaysGenerated(col)).toBe(true);
  });
  it('is true if col.Extra contains "STORED GENERATED" case insensitvely', () => {
    col.Extra = 'STORED GENERATED';
    expect(isFieldColumnAlwaysGenerated(col)).toBe(true);
    col.Extra = 'STOREd gENERATED';
    expect(isFieldColumnAlwaysGenerated(col)).toBe(true);
  });
  it('is false if col.Extra is  "DEFAULT_GENERATED"', () => {
    col.Extra = 'DEFAULT_GENERATED';
    expect(isFieldColumnAlwaysGenerated(col)).toBe(false);
  });
});
describe('isFieldColumnAutoIncrement', () => {
  let col: DatabaseTableColumnInfo;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('is true if Extra contains "auto_increment", case insensitively', () => {
    col.Extra = 'auto_increment';
    expect(isFieldColumnAutoIncrement(col)).toBe(true);
    // for completeness...
    col.Extra = 'auto_increment invisible';
    expect(isFieldColumnAutoIncrement(col)).toBe(true);
    col.Extra = 'invisible auto_increment';
    expect(isFieldColumnAutoIncrement(col)).toBe(true);
    col.Extra = 'AUTO_increment';
    expect(isFieldColumnAutoIncrement(col)).toBe(true);
  });
  it('is false if Extra does not match', () => {
    col.Extra = 'auto_incrementfoo';
    expect(isFieldColumnAutoIncrement(col)).toBe(false);
    col.Extra = 'fooauto_increment';
    expect(isFieldColumnAutoIncrement(col)).toBe(false);
  });
});

describe('isFieldColumnPrimaryKey', () => {
  let col: DatabaseTableColumnInfo;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('is true if the Key is exactly "PRI"', () => {
    col.Key = 'PRI';
    expect(isFieldColumnPrimaryKey(col)).toBe(true);
  });
  it('is true if the Key is not exactly "PRI"', () => {
    col.Key = 'MUL';
    expect(isFieldColumnPrimaryKey(col)).toBe(false);
    col.Key = 'UNI';
    expect(isFieldColumnPrimaryKey(col)).toBe(false);
    col.Key = '';
    expect(isFieldColumnPrimaryKey(col)).toBe(false);
  });
});

describe('getFieldJavascriptType', () => {
  let col: DatabaseTableColumnInfo;
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
  let col: DatabaseTableColumnInfo;
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

describe('parseFieldDefinition', () => {
  it('should work', () => {
    const column: DatabaseTableColumnInfo = {
      ...colInfoTemplate,
      Field: 'emailVerified',
      Type: 'tinyint(1)'
    };
    const def = parseFieldDefinition(column, {});
    expect(def.fieldName).toBe('emailVerified');
    expect(def.knownMySQLType).toBe('tinyint');
  });
});

describe('hasColumnCommentAnnotation', () => {
  it('should be true if the column comment matches', () => {
    const column: DatabaseTableColumnInfo = {
      ...colInfoTemplate,
      Comment: '@foo'
    };
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
    column.Comment = '@bar @foo';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it('should be true if the column comment matches, with args', () => {
    const column: DatabaseTableColumnInfo = {
      ...colInfoTemplate,
      Comment: '@foo(something)'
    };
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
    column.Comment = '@foo ( something)';
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it('should be case insensitive', () => {
    const column: DatabaseTableColumnInfo = {
      ...colInfoTemplate,
      Comment: '@FoO'
    };
    expect(hasColumnCommentAnnotation('foo', column)).toBe(true);
  });
  it("should be false if the column comment doesn't match", () => {
    const column: DatabaseTableColumnInfo = {
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
