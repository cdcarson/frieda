import { describe, it, expect, beforeEach } from 'vitest';
import type { Column, TypeOptions } from '../api/types.js';
import {
  getBigIntAnnotation,
  getCastType,
  getCommentAnnotations,
  getCreateModelFieldPresence,
  getFieldName,
  getJavascriptType,
  getModelFieldPresence,
  getMysqlBaseType,
  getParenthesizedArgs,
  getSetAnnotation,
  getUpdateModelFieldPresence,
  getValidEnumAnnotation,
  getValidJsonAnnotation,
  hasDefault,
  isAutoIncrement,
  isGeneratedAlways,
  isInvisible,
  isNullable,
  isPrimaryKey,
  isTinyIntOne,
  isUnique
} from './field-parsers.js';
import { MYSQL_TYPES } from '../api/types.js';
import {
  CreateModelFieldPresence,
  ModelFieldPresence,
  UpdateModelFieldPresence
} from './types.js';

describe('field-parsers', () => {
  let column: Column;
  let options: Partial<TypeOptions>;
  beforeEach(() => {
    column = {
      Comment: '',
      Default: null,
      Extra: '',
      Field: '',
      Key: '',
      Null: 'NO',
      Type: '',
      Collation: null,
      Privileges: ''
    };
    options = {};
  });
  it('getFieldName works', () => {
    expect(getFieldName({ ...column, Field: 'foo_bar' })).toBe('fooBar');
    expect(getFieldName({ ...column, Field: 'Foo_bar' })).toBe('fooBar');
    expect(getFieldName({ ...column, Field: 'Foo__bar' })).toBe('fooBar');
    expect(getFieldName({ ...column, Field: 'fooBar' })).toBe('fooBar');
    expect(getFieldName({ ...column, Field: 'FooBar' })).toBe('fooBar');
  });
  it('isPrimaryKey works', () => {
    expect(isPrimaryKey({ ...column, Key: 'PRI' })).toBe(true);
    expect(isPrimaryKey({ ...column, Key: 'UNI' })).toBe(false);
    expect(isPrimaryKey({ ...column, Key: 'MUL' })).toBe(false);
  });
  it('isAutoIncrement works', () => {
    expect(isAutoIncrement({ ...column, Extra: 'auto_increment' })).toBe(true);
    expect(isAutoIncrement({ ...column, Extra: '' })).toBe(false);
  });
  it('isUnique works', () => {
    expect(isUnique({ ...column, Key: 'PRI' })).toBe(false);
    expect(isUnique({ ...column, Key: 'UNI' })).toBe(true);
    expect(isUnique({ ...column, Key: 'MUL' })).toBe(false);
  });
  it('hasDefault works', () => {
    expect(hasDefault({ ...column, Default: 'a' })).toBe(true);
    expect(hasDefault({ ...column, Default: null, Null: 'YES' })).toBe(true);
    expect(hasDefault({ ...column, Default: null, Null: 'NO' })).toBe(false);
  });
  it('isGeneratedAlways works', () => {
    expect(isGeneratedAlways({ ...column, Extra: 'STORED GENERATED' })).toBe(
      true
    );
    expect(isGeneratedAlways({ ...column, Extra: 'VIRTUAL GENERATED' })).toBe(
      true
    );
    expect(isGeneratedAlways({ ...column, Extra: '' })).toBe(false);
  });
  it('isInvisible works', () => {
    expect(isInvisible({ ...column, Extra: 'INVISIBLE' })).toBe(true);
    expect(isInvisible({ ...column, Extra: '' })).toBe(false);
  });
  it('isNullable works', () => {
    column.Null = 'NO';
    expect(isNullable(column)).toBe(false);
    column.Null = 'YES';
    expect(isNullable(column)).toBe(true);
  });

  it('getMysqlBaseType works', () => {
    MYSQL_TYPES.forEach((t) => {
      expect(getMysqlBaseType({ ...column, Type: t })).toBe(t);
      expect(getMysqlBaseType({ ...column, Type: `${t}(5)` })).toBe(t);
    });
    expect(getMysqlBaseType({ ...column, Type: `foobar` })).toBe(null);
  });
  it('getCommentAnnotations works', () => {
    expect(
      getCommentAnnotations({ ...column, Comment: '@json(MyType)' })
    ).toEqual([
      {
        fullAnnotation: '@json(MyType)',
        annotation: 'json',
        argument: 'MyType'
      }
    ]);
    expect(
      getCommentAnnotations({ ...column, Comment: '@JsOn(MyType)' })
    ).toEqual([
      {
        fullAnnotation: '@JsOn(MyType)',
        annotation: 'json',
        argument: 'MyType'
      }
    ]);
    expect(getCommentAnnotations({ ...column, Comment: '@bigint' })).toEqual([
      {
        fullAnnotation: '@bigint',
        annotation: 'bigint'
      }
    ]);
    expect(getCommentAnnotations({ ...column, Comment: '@enum(Foo)' })).toEqual(
      [
        {
          fullAnnotation: '@enum(Foo)',
          annotation: 'enum',
          argument: 'Foo'
        }
      ]
    );
    expect(getCommentAnnotations({ ...column, Comment: '@set(Foo)' })).toEqual([
      {
        fullAnnotation: '@set(Foo)',
        annotation: 'set',
        argument: 'Foo'
      }
    ]);
  });
  describe('getCastType', () => {
    it('json', () => {
      expect(getCastType({ ...column, Type: 'json' }, options)).toBe('json');
    });
    it('bigint with typeBigIntAsString default', () => {
      expect(getCastType({ ...column, Type: 'bigint' }, options)).toBe(
        'string'
      );
    });
    it('bigint with typeBigIntAsString = false', () => {
      expect(
        getCastType(
          { ...column, Type: 'bigint' },
          { typeBigIntAsString: false }
        )
      ).toBe('bigint');
    });
    it('bigint with typeBigIntAsString = true', () => {
      expect(
        getCastType({ ...column, Type: 'bigint' }, { typeBigIntAsString: true })
      ).toBe('string');
    });
    it('bigint with @bigint', () => {
      expect(
        getCastType(
          { ...column, Type: 'bigint', Comment: '@bigint' },
          { typeBigIntAsString: true }
        )
      ).toBe('bigint');
    });

    it('tinyint(1) with default typeTinyIntOneAsBoolean', () => {
      expect(getMysqlBaseType({ ...column, Type: 'tinyint(1)' })).toBe(
        'tinyint'
      );
      expect(getCastType({ ...column, Type: 'tinyint(1)' }, options)).toBe(
        'boolean'
      );
    });
    it('tinyint(1) with typeTinyIntOneAsBoolean true', () => {
      expect(getMysqlBaseType({ ...column, Type: 'tinyint(1)' })).toBe(
        'tinyint'
      );
      expect(
        getCastType(
          { ...column, Type: 'tinyint(1)' },
          { typeTinyIntOneAsBoolean: true }
        )
      ).toBe('boolean');
    });
    it('tinyint(1) with typeTinyIntOneAsBoolean false', () => {
      expect(getMysqlBaseType({ ...column, Type: 'tinyint(1)' })).toBe(
        'tinyint'
      );
      expect(
        getCastType(
          { ...column, Type: 'tinyint(1)' },
          { typeTinyIntOneAsBoolean: false }
        )
      ).toBe('int');
    });
    it('bool and boolean', () => {
      expect(
        getCastType(
          { ...column, Type: 'bool' },
          { typeTinyIntOneAsBoolean: false }
        )
      ).toBe('boolean');
      expect(
        getCastType(
          { ...column, Type: 'boolean' },
          { typeTinyIntOneAsBoolean: false }
        )
      ).toBe('boolean');
    });
    it('set without annotation', () => {
      expect(
        getCastType({ ...column, Type: `set('a','b')`, Comment: '' }, {})
      ).toBe('string');
    });
    it('set with plain annotation', () => {
      expect(
        getCastType({ ...column, Type: `set('a','b')`, Comment: '@Set' }, {})
      ).toBe('set');
    });
    it('set with typed annotation', () => {
      expect(
        getCastType(
          { ...column, Type: `set('a','b')`, Comment: '@Set(MyType)' },
          {}
        )
      ).toBe('set');
    });
    it('enum without annotation', () => {
      expect(
        getCastType({ ...column, Type: `enum('a','b')`, Comment: '' }, {})
      ).toBe('enum');
    });
    it('enum with typed annotation', () => {
      expect(
        getCastType(
          { ...column, Type: `enum('a','b')`, Comment: '@enum(MyType)' },
          {}
        )
      ).toBe('enum');
    });
    it('tinyint with width other than 1', () => {
      expect(getParenthesizedArgs('tinyint', 'tinyint')).toBe('');
      expect(getCastType({ ...column, Type: 'tinyint(2)' }, options)).toBe(
        'int'
      );
      expect(getCastType({ ...column, Type: 'tinyint' }, options)).toBe('int');
    });
    it('all the other int types', () => {
      ['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'year'].forEach(
        (t) => {
          expect(getCastType({ ...column, Type: t }, {})).toBe('int');
        }
      );
    });
    it('all the floaty types', () => {
      ['float', 'double', 'real', 'decimal', 'numeric'].forEach((t) => {
        expect(getCastType({ ...column, Type: t }, {})).toBe('float');
      });
    });
    it('all the date types', () => {
      ['datetime', 'timestamp', 'date'].forEach((t) => {
        expect(getCastType({ ...column, Type: t }, {})).toBe('date');
      });
    });

    it('all the string types', () => {
      [
        'char',
        'binary',
        'varchar',
        'varbinary',
        'tinyblob',
        'tinytext',
        'blob',
        'text',
        'mediumblob',
        'mediumtext',
        'longblob',
        'longtext',
        'time'
      ].forEach((t) => {
        expect(getCastType({ ...column, Type: t }, {})).toBe('string');
      });
    });
  });

  describe('getCastType', () => {
    it('json without a type', () => {
      expect(getJavascriptType({ ...column, Type: 'json' }, options)).toBe(
        'unknown'
      );
      expect(
        getJavascriptType(
          { ...column, Type: 'json', Comment: '@json' },
          options
        )
      ).toBe('unknown');
    });
    it('json with a type', () => {
      expect(
        getJavascriptType(
          { ...column, Type: 'json', Comment: '@json(Stripe.Customer)' },
          options
        )
      ).toBe('Stripe.Customer');
    });
    it('bigint with typeBigIntAsString default', () => {
      expect(getJavascriptType({ ...column, Type: 'bigint' }, options)).toBe(
        'string'
      );
    });
    it('bigint with typeBigIntAsString = false', () => {
      expect(
        getJavascriptType(
          { ...column, Type: 'bigint' },
          { typeBigIntAsString: false }
        )
      ).toBe('bigint');
    });
    it('bigint with typeBigIntAsString = true', () => {
      expect(
        getJavascriptType(
          { ...column, Type: 'bigint' },
          { typeBigIntAsString: true }
        )
      ).toBe('string');
    });
    it('bigint with @bigint', () => {
      expect(
        getJavascriptType(
          { ...column, Type: 'bigint', Comment: '@bigint' },
          { typeBigIntAsString: true }
        )
      ).toBe('bigint');
    });

    it('tinyint(1) with default typeTinyIntOneAsBoolean', () => {
      expect(
        getJavascriptType({ ...column, Type: 'tinyint(1)' }, options)
      ).toBe('boolean');
    });
    it('tinyint(1) with typeTinyIntOneAsBoolean true', () => {
      expect(
        getJavascriptType(
          { ...column, Type: 'tinyint(1)' },
          { typeTinyIntOneAsBoolean: true }
        )
      ).toBe('boolean');
    });
    it('tinyint(1) with typeTinyIntOneAsBoolean false', () => {
      expect(
        getJavascriptType(
          { ...column, Type: 'tinyint(1)' },
          { typeTinyIntOneAsBoolean: false }
        )
      ).toBe('number');
    });
    it('bool and boolean', () => {
      expect(
        getJavascriptType(
          { ...column, Type: 'bool' },
          { typeTinyIntOneAsBoolean: false }
        )
      ).toBe('boolean');
      expect(
        getJavascriptType(
          { ...column, Type: 'boolean' },
          { typeTinyIntOneAsBoolean: false }
        )
      ).toBe('boolean');
    });
    it('set without annotation', () => {
      expect(
        getJavascriptType({ ...column, Type: `set('a','b')`, Comment: '' }, {})
      ).toBe('string');
    });
    it('set with plain annotation', () => {
      expect(
        getJavascriptType(
          { ...column, Type: `set('a','b')`, Comment: '@Set' },
          {}
        )
      ).toBe(`Set<'a'|'b'>`);
      expect(
        getJavascriptType({ ...column, Type: `set()`, Comment: '@Set' }, {})
      ).toBe(`Set<string>`);
    });
    it('set with typed annotation', () => {
      expect(
        getJavascriptType(
          { ...column, Type: `set('a','b')`, Comment: '@Set(MyType)' },
          {}
        )
      ).toBe('Set<MyType>');
    });
    it('enum without annotation', () => {
      expect(
        getJavascriptType({ ...column, Type: `enum('a','b')`, Comment: '' }, {})
      ).toBe(`'a'|'b'`);
      expect(
        getJavascriptType({ ...column, Type: `enum()`, Comment: '' }, {})
      ).toBe(`string`);
    });
    it('enum with typed annotation', () => {
      expect(
        getJavascriptType(
          { ...column, Type: `enum('a','b')`, Comment: '@enum(MyType)' },
          {}
        )
      ).toBe('MyType');
    });
    it('tinyint with width other than 1', () => {
      expect(getParenthesizedArgs('tinyint', 'tinyint')).toBe('');
      expect(
        getJavascriptType({ ...column, Type: 'tinyint(2)' }, options)
      ).toBe('number');
      expect(getJavascriptType({ ...column, Type: 'tinyint' }, options)).toBe(
        'number'
      );
    });
    it('all the other int types', () => {
      ['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'year'].forEach(
        (t) => {
          expect(getJavascriptType({ ...column, Type: t }, {})).toBe('number');
          expect(getJavascriptType({ ...column, Type: `${t}(2)` }, {})).toBe(
            'number'
          );
        }
      );
    });
    it('all the floaty types', () => {
      ['float', 'double', 'real', 'decimal', 'numeric'].forEach((t) => {
        expect(getJavascriptType({ ...column, Type: t }, {})).toBe('number');
      });
    });
    it('all the date types', () => {
      ['datetime', 'timestamp', 'date'].forEach((t) => {
        expect(getJavascriptType({ ...column, Type: t }, {})).toBe('Date');
      });
    });

    it('all the string types', () => {
      [
        'char',
        'binary',
        'varchar',
        'varbinary',
        'tinyblob',
        'tinytext',
        'blob',
        'text',
        'mediumblob',
        'mediumtext',
        'longblob',
        'longtext',
        'time',
        'foobar'
      ].forEach((t) => {
        expect(getJavascriptType({ ...column, Type: t }, {})).toBe('string');
      });
    });
  });

  it('getModelFieldPresence works', () => {
    expect(getModelFieldPresence({ ...column, Extra: 'INVISIBLE' })).toBe(
      ModelFieldPresence.undefinedForSelectAll
    );
    expect(getModelFieldPresence({ ...column, Extra: 'foo' })).toBe(
      ModelFieldPresence.present
    );
  });
  it('getCreateModelFieldPresence works', () => {
    expect(
      getCreateModelFieldPresence({ ...column, Extra: 'STORED GENERATED' })
    ).toBe(CreateModelFieldPresence.omittedGenerated);
    expect(
      getCreateModelFieldPresence({ ...column, Extra: 'VIRTUAL GENERATED' })
    ).toBe(CreateModelFieldPresence.omittedGenerated);
    expect(
      getCreateModelFieldPresence({ ...column, Extra: 'auto_increment' })
    ).toBe(CreateModelFieldPresence.optionalAutoIncrement);
    expect(getCreateModelFieldPresence({ ...column, Default: 'shhsh' })).toBe(
      CreateModelFieldPresence.optionalHasDefault
    );
    expect(
      getCreateModelFieldPresence({ ...column, Default: null, Null: 'YES' })
    ).toBe(CreateModelFieldPresence.optionalHasDefault);
    expect(getCreateModelFieldPresence({ ...column })).toBe(
      CreateModelFieldPresence.required
    );
  });
  it('getUpdateModelFieldPresence', () => {
    expect(getUpdateModelFieldPresence(column)).toBe(
      UpdateModelFieldPresence.optional
    );
    expect(
      getUpdateModelFieldPresence({ ...column, Extra: 'STORED GENERATED' })
    ).toBe(UpdateModelFieldPresence.omittedGenerated);
    expect(
      getUpdateModelFieldPresence({ ...column, Extra: 'VIRTUAL GENERATED' })
    ).toBe(UpdateModelFieldPresence.omittedGenerated);
    expect(getUpdateModelFieldPresence({ ...column, Key: 'PRI' })).toBe(
      UpdateModelFieldPresence.omittedPrimaryKey
    );
  });

  it('isTinyIntOne', () => {
    expect(isTinyIntOne({...column, Type: 'tinyint(1)'})).toBe(true)
    expect(isTinyIntOne({...column, Type: 'tinyint'})).toBe(false)
    expect(isTinyIntOne({...column, Type: 'int(1)'})).toBe(false)
  })
  it('getValidEnumAnnotation', () => {
    expect(getValidEnumAnnotation({...column, Comment: '@enum(Foo)'})).toBeTruthy()
    expect(getValidEnumAnnotation({...column, Comment: '@enum'})).toBeUndefined()
  })
  it('getValidJsonAnnotation', () => {
    expect(getValidJsonAnnotation({...column, Comment: '@json(Foo)'})).toBeTruthy()
    expect(getValidJsonAnnotation({...column, Comment: '@json'})).toBeUndefined()
  })
  it('getBigIntAnnotation', () => {
    expect(getBigIntAnnotation({...column, Comment: '@bigint'})).toBeTruthy()
    expect(getBigIntAnnotation({...column, Comment: '@json'})).toBeUndefined()
  })
  it('getSetAnnotation', () => {
    expect(getSetAnnotation({...column, Comment: '@set'})).toBeTruthy()
    expect(getSetAnnotation({...column, Comment: '@set(Foo)'})).toBeTruthy()
    expect(getSetAnnotation({...column, Comment: '@json'})).toBeUndefined()
  })
  //
});
