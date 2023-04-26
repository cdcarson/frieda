import { editAsync } from 'external-editor';

import type { FullSettings } from './types.js';
import { getMysql2Connection } from './database-connections.js';

export const createMigration = async () => {
  return new Promise((resolve, reject) => {
    editAsync('-- new migration\n\n', (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};




