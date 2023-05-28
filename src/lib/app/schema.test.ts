import { describe, it, expect, beforeEach } from 'vitest';

import { Schema } from './schema.js';
import type { FetchedSchema } from './types.js';

describe('schema', () => {
  let fetched: FetchedSchema
  beforeEach(() => {
    fetched = {
      fetched: new Date(),
      databaseName: 'foo',
      tables: [

      ]
    }
  })
  it('is serializable', () => {
    const s = new Schema(fetched);
    const ser = JSON.stringify(s);
    const deser = JSON.parse(ser);
    expect(deser.databaseName).toBe(s.databaseName)
  })
})
