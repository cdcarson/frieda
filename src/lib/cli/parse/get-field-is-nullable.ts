import type { DatabaseShowFullColumnsRow } from '../types.js';

/**
 * Whether the field is possibly undefined in the base model,
 * i.e., that `Extra` contains `INVISIBLE`, so SELECT * omits the column.
 */
export const getFieldIsNullable = (
  column: DatabaseShowFullColumnsRow
): boolean => {
  return column.Null === 'YES';
};
