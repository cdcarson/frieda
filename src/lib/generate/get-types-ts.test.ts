import { describe, it, expect, beforeEach } from 'vitest';
import type { TypeOptions } from '../api/types.js';
import { getTypesTs } from './get-types-ts.js';
import type { FetchedSchema } from '$lib/fetch/types.js';

describe('getTypesTs', () => {
  let schema: FetchedSchema;
  let options: TypeOptions;
  beforeEach(() => {
    options = {
      typeBigIntAsString: true,
      typeImports: [],
      typeTinyIntOneAsBoolean: true
    };
    schema = {
      databaseName: 't',
      tables: [
        {
          columns: [
            {
              Field: 'id',
              Collation: '',
              Comment: '',
              Default: null,
              Extra: '',
              Key: 'PRI',
              Null: 'NO',
              Privileges: '',
              Type: 'bigint unsigned'
            },
            {
              Field: 'test',
              Collation: '',
              Comment: '',
              Default: null,
              Extra: '',
              Key: '',
              Null: 'NO',
              Privileges: '',
              Type: 'text'
            }
          ],
          indexes: [],
          name: 'foo_bar',
          createSql: ''
        }
      ]
    };
  });

  it('works', () => {
    expect(getTypesTs(schema, options, '/** a comment */')).toContain(
      'export type FooBar'
    );
    expect(getTypesTs(schema, options, '/** a comment */')).toContain(
      '/** a comment */'
    );
  });
});
