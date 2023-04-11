import { getDatabaseSchema } from '../../dist/parsing/get-database-schema';
import type { ExecutedQuery } from '@planetscale/database';
import type { Connection } from '@planetscale/database';
import { it, expect, beforeEach, describe, jest } from '@jest/globals';

describe('getDatabaseSchema', () => {
  let conn: {execute: (query: string) => Promise<unknown>};
  beforeEach(() => {
    conn = {
      execute: async (query: string) => {
        if (query === 'SHOW FULL TABLES') {
          const executed: ExecutedQuery = {
            fields: [{ name: 'Tables_in_foo' }],
            rows: [{ Tables_in_foo: 'a' }, { Tables_in_foo: 'b' }]
          } as unknown as ExecutedQuery;
          return Promise.resolve(executed);
        }
        return {
          rows: []
        };
      }
    };
  });
  it ('gets the table names', async () => {
    const spy = jest.spyOn(conn, 'execute')
    const result = await getDatabaseSchema(conn as Connection);
    expect(spy).toHaveBeenCalledWith('SHOW FULL TABLES')


  })
});

