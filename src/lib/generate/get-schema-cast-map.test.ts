import { describe, it, expect, beforeEach } from 'vitest';
import type { TypeOptions } from '../api/types.js';
import { getSchemaCastMap } from './get-schema-cast-map.js';
import type { FetchedSchema } from '../fetch/types.js';

describe('getSchemaCastMap', () => {
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
    const map = getSchemaCastMap(schema, options);
    expect(map['foo_bar.id']).toBe('string');
    expect(map['foo_bar.test']).toBe('string');
  });
});
