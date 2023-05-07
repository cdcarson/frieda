import type { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';
import type { CastType } from '../cast-type.js';
import type { DatabaseShowColumnsRow, Options } from '../types.js';
import { getParenthesizedArgs } from './get-parenthesized-args.js';
import { hasColumnCommentAnnotation } from './has-column-comment-annotation.js';

export const getFieldCastType = (
  col: DatabaseShowColumnsRow,
  knownMySQLType: (typeof KNOWN_MYSQL_TYPES)[number] | null,
  settings: Partial<Options>
): CastType => {
  if (!knownMySQLType) {
    return 'string';
  }

  // json, an easy one...
  if ('json' === knownMySQLType) {
    return 'json';
  }

  // bigint
  if ('bigint' === knownMySQLType) {
    // type as string can be turned off globally
    if (settings.typeBigIntAsString === false) {
      return 'bigint';
    }
    // cast to string can be turned of for the column...
    if (hasColumnCommentAnnotation('bigint', col)) {
      return 'bigint';
    }
    return 'string';
  }

  // the boolean case, tinyint(1)...
  if (
    knownMySQLType === 'tinyint' &&
    getParenthesizedArgs(col.Type, knownMySQLType).trim() === '1'
  ) {
    // type as boolean can be turned off globally
    if (settings.typeTinyIntOneAsBoolean === false) {
      return 'int';
    }
    return 'boolean';
  }

  // having dealt with the special int cases, bigint and tinyint(1), do the other int types...
  if (
    (
      [
        'tinyint',
        'int',
        'integer',
        'smallint',
        'mediumint'
      ] as (typeof KNOWN_MYSQL_TYPES)[number][]
    ).includes(knownMySQLType)
  ) {
    return 'int';
  }

  // floaty types...
  if (
    (
      [
        'float',
        'double',
        'real',
        'decimal',
        'numeric'
      ] as (typeof KNOWN_MYSQL_TYPES)[number][]
    ).includes(knownMySQLType)
  ) {
    return 'float';
  }

  // date types
  if (
    (
      ['date', 'datetime', 'timestamp'] as (typeof KNOWN_MYSQL_TYPES)[number][]
    ).includes(knownMySQLType)
  ) {
    return 'date';
  }

  // set...
  if (knownMySQLType === 'set') {
    return 'set';
  }

  // enum...
  if (knownMySQLType === 'enum') {
    return 'enum';
  }

  // year... (this is separate from the int types above, cuz we may want some options around this)
  if (knownMySQLType === 'year') {
    return 'int';
  }

  // everything else is cast to string, including enum, time, bit
  return 'string';
};
