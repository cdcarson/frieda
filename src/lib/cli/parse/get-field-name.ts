import type { DatabaseShowFullColumnsRow } from '../types.js';
import camelcase from 'camelcase';
export const getFieldName = (column: DatabaseShowFullColumnsRow) => {
  return camelcase(column.Field);
};
