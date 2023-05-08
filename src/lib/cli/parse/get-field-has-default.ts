import type { DatabaseShowFullColumnsRow } from '../types.js';
import { getFieldIsNullable } from './get-field-is-nullable.js';


export const getFieldHasDefault = (
  column: DatabaseShowFullColumnsRow
): boolean => {
  return (
    typeof column.Default === 'string' ||
    (getFieldIsNullable(column) && column.Default === null)
  );
};
