import type { DatabaseShowFullColumnsRow } from '../types.js';

export const getFieldIsAlwaysGenerated = (
  column: DatabaseShowFullColumnsRow
): boolean => {
  return /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
};
