import type { CastType } from '$lib/index.js';
import { DEFAULT_JSON_FIELD_TYPE } from '../constants.js';
import type { DatabaseShowColumnsRow } from '../types.js';
import { getParenthesizedArgs } from './get-parenthesized-args.js';
import { hasColumnCommentAnnotation } from './has-column-comment-annotation.js';

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
  col: DatabaseShowColumnsRow,
  castType: CastType
): string => {
  if (castType === 'json') {
    if (hasColumnCommentAnnotation('json', col)) {
      return getParenthesizedArgs(col.Comment, '@json');
    }
    return DEFAULT_JSON_FIELD_TYPE;
  }
  if (castType === 'set') {
    const strings = getParenthesizedArgs(col.Type, 'set')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('|');
    return strings.length > 0 ? `Set<${strings}>` : `Set<string>`;
  }
  if (castType === 'enum') {
    const strings = getParenthesizedArgs(col.Type, 'enum')
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
    case 'string':
      return 'string';
  }
};
