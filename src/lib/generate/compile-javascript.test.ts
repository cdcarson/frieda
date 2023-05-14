import { describe, it, expect, beforeEach, vi } from 'vitest';
import { compileJavascript } from './compile-javascript.js';
import type { FsPaths } from '$lib/fs/types.js';
import { TS_COMPILER_OPTIONS } from './constants.js';
import ts from 'typescript';
import type { TypescriptCode } from './types.js';
import { getTypescript } from './get-typescript.js';
describe('compileJavascript', () => {
  let typescript: TypescriptCode;
  beforeEach(() => {
    typescript = getTypescript(
      {
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
      },
      {
        typeBigIntAsString: true,
        typeImports: [],
        typeTinyIntOneAsBoolean: true
      },
      '/** a comment */'
    );
  });

  it('works', () => {
    const js = compileJavascript(typescript);
    console.log(js['database.d.ts']);
    expect(js['database.js']).toContain('AppDb');
  });
});
