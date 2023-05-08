import type { DatabaseShowFullColumnsRow } from "../types.js";

/**
 * Whether the field is possibly undefined in the base model,
 * i.e., that `Extra` contains `INVISIBLE`, so SELECT * omits the column.
 */
export const getFieldIsInvisible = (column: DatabaseShowFullColumnsRow): boolean => {
  return /\bINVISIBLE\b/i.test(column.Extra);
};
