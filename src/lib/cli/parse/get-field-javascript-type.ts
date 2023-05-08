import { getFieldCommentAnnotations } from './get-field-comment-annotations.js';
import type { TypeOptions } from '../../api/types.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';
import { getFieldCastType } from './get-field-cast-type.js';
import { DEFAULT_JSON_FIELD_TYPE } from '../constants.js';
import { getParenthesizedArgs } from './get-parenthesized-args.js';

/**
 * Returns the javascript (typescript) type as a string,
 * based on the raw column definition and the previously
 * computed CastType.
 *
 * In addition to the javascript native types, we
 * - allow json to be explicitly typed
 * - type set as Set<'a'|'b'> based on the column def
 * - type enum as 'a'|'b' based on the column def
 */
export const getFieldJavascriptType = (
  column: DatabaseShowFullColumnsRow,
  options: Partial<TypeOptions>
): string => {
  const castType = getFieldCastType(column, options);
  const annotations = getFieldCommentAnnotations(column);
  if (castType === 'json') {
    const typeAnnotation = annotations.find((a) => a.annotation === 'json');
    if (
      typeAnnotation &&
      typeAnnotation.argument &&
      typeAnnotation.argument.trim().length > 0
    ) {
      return typeAnnotation.argument.trim();
    }
    return DEFAULT_JSON_FIELD_TYPE;
  }
  if (castType === 'set') {
    const typeAnnotation = annotations.find((a) => a.annotation === 'set');
    if (typeAnnotation) {
      if (
        typeAnnotation.argument &&
        typeAnnotation.argument.trim().length > 0
      ) {
        return `Set<${typeAnnotation.argument.trim()}>`;
      }
      const strings = getParenthesizedArgs(column.Type, 'set')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join('|');
      return strings.length > 0 ? `Set<${strings}>` : `Set<string>`;
    }
    return 'string';
  }
  if (castType === 'enum') {
    const typeAnnotation = annotations.find((a) => a.annotation === 'enum');
    if (
      typeAnnotation &&
      typeAnnotation.argument &&
      typeAnnotation.argument.trim().length > 0
    ) {
      return typeAnnotation.argument.trim();
    }
    const strings = getParenthesizedArgs(column.Type, 'enum')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('|');
    return strings.length > 0 ? strings : `string`;
  }
  switch (castType) {
    case 'bigint':
      return 'bigint';
    case 'date':
      return 'Date';
    case 'boolean':
      return 'boolean';
    case 'int':
    case 'float':
      return 'number';
  }
  return 'string';
};
