import { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';
import type { DatabaseShowColumnsRow } from '../types.js';
import { getMatchAmong } from './get-match-among.js';

/**
 * Extracts one of KNOWN_MYSQL_TYPES from the column's type def.
 * Returns null if no match is found.
 */
export const getFieldKnownMySQLType = (
  column: DatabaseShowColumnsRow
): (typeof KNOWN_MYSQL_TYPES)[number] | null => {
  const found = getMatchAmong(column.Type, Array.from(KNOWN_MYSQL_TYPES));
  if (found.length > 0) {
    return found[0].toLowerCase() as (typeof KNOWN_MYSQL_TYPES)[number];
  }
  return null;
};
