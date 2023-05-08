import { MYSQL_TYPES, type MysqlType } from '../../api/types.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';

export const getFieldMysqlType = (
  column: DatabaseShowFullColumnsRow
): MysqlType | null => {
  const rx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
  const match = column.Type.match(rx);
  if (match) {
    return match[0].toLowerCase() as MysqlType;
  }
  return null;
};
