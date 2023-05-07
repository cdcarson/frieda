import type { FieldDefinition } from '$lib/index.js';
import type { DatabaseShowColumnsRow, Options } from '../types.js';
import { getFieldCastType } from './get-field-cast-type.js';
import { getFieldJavascriptType } from './get-field-javascript-type.js';
import { getFieldKnownMySQLType } from './get-field-known-mysql-type.js';
import _ from 'lodash';
/**
 * See https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export const parseFieldDefinition = (
  column: DatabaseShowColumnsRow,
  settings: Partial<Options>
): FieldDefinition => {
  const fieldName = _.camelCase(column.Field);
  const knownMySQLType = getFieldKnownMySQLType(column);
  const castType = getFieldCastType(column, knownMySQLType, settings);
  const javascriptType = getFieldJavascriptType(column, castType);
  const isPrimaryKey = column.Key === 'PRI';
  const isAutoIncrement = /\bauto_increment\b/i.test(column.Extra);
  const isUnique = column.Key === 'UNI';
  const isAlwaysGenerated = /\b(VIRTUAL|STORED) GENERATED\b/i.test(
    column.Extra
  );
  const isDefaultGenerated = /\bDEFAULT_GENERATED\b/i.test(column.Extra);
  const isInvisible = /\bINVISIBLE\b/i.test(column.Extra);
  const isNullable = column.Null === 'YES';
  const hasDefault =
    typeof column.Default === 'string' ||
    (isNullable && column.Default === null);
  return {
    fieldName,
    columnName: column.Field,
    columnType: column.Type,
    columnComment: column.Comment,
    columnDefault: column.Default,
    columnExtra: column.Extra,
    columnKey: column.Key,
    columnNull: column.Null,
    knownMySQLType,
    castType,
    javascriptType,
    isPrimaryKey,
    isAutoIncrement,
    isAlwaysGenerated,
    isDefaultGenerated,
    isInvisible,
    isNullable,
    isUnique,
    hasDefault,
    isOmittableInModel: isInvisible,
    isOmittedFromCreateData: isAlwaysGenerated,
    isOptionalInCreateData: isAutoIncrement || hasDefault,
    isOmittedFromUpdateData: isPrimaryKey || isAlwaysGenerated
  };
};
