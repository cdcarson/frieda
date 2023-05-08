import type { DatabaseShowFullColumnsRow } from '../types.js';

export const getFieldIsAutoIncrement = (
  column: DatabaseShowFullColumnsRow
): boolean => {
  return /\bauto_increment\b/i.test(column.Extra);
};
