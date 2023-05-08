import { describe, it, expect } from 'vitest';
import { getModelTypeDeclarations } from './get-model-type-declarations.js';
import type { Table } from '$lib/index.js';
describe('getModelTypeDeclarations', () => {
  it('works', () => {
    const table: Table = {
      name: 'User',
      columns: [
        {
          Collation: '',
          Comment: '',
          Default: null,
          Extra: 'auto_increment',
          Field: 'id',
          Key: 'PRI',
          Null: 'NO',
          Privileges: '',
          Type: 'bigint'
        }
      ],
      indexes: []
    }
    expect(getModelTypeDeclarations(table, {typeBigIntAsString: true, typeTinyIntOneAsBoolean: true})).toBeTruthy()
  })
})