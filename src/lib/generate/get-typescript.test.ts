import { describe, it, expect, beforeEach } from 'vitest';
import type { TypeOptions } from '../api/types.js';
import { getTypescript } from './get-typescript.js';
import type { FetchedSchema } from '$lib/fetch/types.js';

describe('getTypescript', () => {
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
    const typescript = getTypescript(schema, options, '/** a comment */');
    expect(typescript['database.ts']).toContain('/** a comment */');
    expect(typescript['schema.ts']).toContain('/** a comment */');
    expect(typescript['types.ts']).toContain('/** a comment */');
  });
});
