import type { FetchedSchema } from '$lib/fetch/types.js';
import { createHash } from 'node:crypto';
export const calculateSchemaHash = (fetched: FetchedSchema) => {
  const sql = fetched.tables.reduce((acc, t) => {
    return [acc, t.createSql].join('\n');
  }, '');
  const hash = createHash('sha512');
  const data = hash.update(sql, 'utf-8');
  return data.digest('hex');
};
