import type { FieldDefinition } from '../../api/types.js';
import type { DatabaseShowFullColumnsRow, Options } from '../types.js';
import { getFieldCastType } from './get-field-cast-type.js';
import { getFieldHasDefault } from './get-field-has-default.js';
import { getFieldIsAlwaysGenerated } from './get-field-is-always-generated.js';
import { getFieldIsAutoIncrement } from './get-field-is-auto-increment.js';
import { getFieldIsInvisible } from './get-field-is-invisible.js';
import { getFieldIsNullable } from './get-field-is-nullable.js';
import { getFieldIsPrimaryKey } from './get-field-is-primary-key.js';
import { getFieldIsUnique } from './get-field-is-unique.js';
import { getFieldJavascriptType } from './get-field-javascript-type.js';
import { getFieldMysqlType } from './get-field-mysql-type.js';
import { getFieldName } from './get-field-name.js';

export const parseField = (
  column: DatabaseShowFullColumnsRow,
  options: Options
): FieldDefinition => {
  return {
    fieldName: getFieldName(column),
    columnName: column.Field,
    castType: getFieldCastType(column, options),
    hasDefault: getFieldHasDefault(column),
    isAlwaysGenerated: getFieldIsAlwaysGenerated(column),
    isAutoIncrement: getFieldIsAutoIncrement(column),
    isInvisible: getFieldIsInvisible(column),
    isNullable: getFieldIsNullable(column),
    isPrimaryKey: getFieldIsPrimaryKey(column),
    isUnique: getFieldIsUnique(column),
    javascriptType: getFieldJavascriptType(column, options),
    mysqlType: getFieldMysqlType(column)
  };
};
