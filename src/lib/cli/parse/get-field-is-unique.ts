import type { DatabaseShowFullColumnsRow } from "../types.js";


/**
 * true if DatabaseColumnRow.Key === 'UNI'
 */
export const getFieldIsUnique = (column: DatabaseShowFullColumnsRow): boolean => {
  return column.Key === 'UNI';
};
