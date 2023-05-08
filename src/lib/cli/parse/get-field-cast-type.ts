import { getFieldCommentAnnotations } from './get-field-comment-annotations.js';
import type { CastType, MysqlType, TypeOptions } from '../../api/types.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';
import { getFieldMysqlType } from './get-field-mysql-type.js';
import { getParenthesizedArgs } from './get-parenthesized-args.js';

export const getFieldCastType = (
  column: DatabaseShowFullColumnsRow,
  typeOptions: Partial<TypeOptions>
): CastType => {
  const mysqlType = getFieldMysqlType(column);
  const annotations = getFieldCommentAnnotations(column);
  if (!mysqlType) {
    return 'string';
  }

  // json, an easy one...
  if ('json' === mysqlType) {
    return 'json';
  }

  // bigint
  if ('bigint' === mysqlType) {
    // type as string can be turned off globally
    if (typeOptions.typeBigIntAsString === false) {
      return 'bigint';
    }
    // cast to string can be turned off for the column...
    if (annotations.find((a) => a.annotation === 'bigint')) {
      return 'bigint';
    }
    return 'string';
  }

  // the boolean case, tinyint(1)...
  if (
    mysqlType === 'tinyint' &&
    getParenthesizedArgs(column.Type, mysqlType).trim() === '1'
  ) {
    // type as boolean can be turned off globally
    if (typeOptions.typeTinyIntOneAsBoolean === false) {
      return 'int';
    }
    return 'boolean';
  }

  // having dealt with the special int cases, bigint and tinyint(1), do the other int types...
  if (
    (
      ['tinyint', 'int', 'integer', 'smallint', 'mediumint'] as MysqlType[]
    ).includes(mysqlType)
  ) {
    return 'int';
  }

  // floaty types...
  if (
    (['float', 'double', 'real', 'decimal', 'numeric'] as MysqlType[]).includes(
      mysqlType
    )
  ) {
    return 'float';
  }

  // date types
  if ((['date', 'datetime', 'timestamp'] as MysqlType[]).includes(mysqlType)) {
    return 'date';
  }

  // set...
  if (mysqlType === 'set') {
    if (annotations.find((a) => a.annotation === 'set')) {
      return 'set';
    }
    return 'string';
  }

  // enum...
  if (mysqlType === 'enum') {
    return 'enum';
  }

  // year... (this is separate from the int types above, because we may want some options around this)
  if (mysqlType === 'year') {
    return 'int';
  }

  // everything else is cast to string, including enum, time, bit
  return 'string';
};
