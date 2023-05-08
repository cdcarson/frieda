import type { DatabaseShowFullColumnsRow } from "../types.js";

/**
 * true if DatabaseColumnRow.Key is 'PRI'
 */
export const getFieldIsPrimaryKey = (column: DatabaseShowFullColumnsRow): boolean => {
  return column.Key === 'PRI';
};