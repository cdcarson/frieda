import { format as fmtSql } from 'sql-formatter';
import type { Annotation, ParsedField, ParsedModel } from './shared.js';

export const isPlainObject = (obj: unknown) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

export const getParenthesizedArgs = (
  source: string,
  prefix: string
): string => {
  const rx = new RegExp(`(\\s|^)${prefix}\\s*\\((.*)\\)(\\s|$)`, 'i');
  const match = source.match(rx);
  return match ? match[2] : '';
};

export const wrapLines = (s: string, lineLength = 60): string[] => {
  const words = s.trim().split(/\s+/);
  const lines = [''];
  while (words.length > 0) {
    const line = lines[lines.length - 1];
    const word = words.shift() as string;
    if (line.length === 0 || line.length + word.length + 1 <= lineLength) {
      lines[lines.length - 1] += ' ' + word;
    } else {
      lines.push(word);
    }
  }
  return lines;
};

export const formatSql = (s: string) => {
  return fmtSql(s, { language: 'mysql', expressionWidth: 20 });
};

export const getFieldColumnDefinition = (
  model: ParsedModel,
  field: ParsedField
): string => {
  const rx = new RegExp(`^\\s*\`${field.columnName}\``);
  const lines = model.table.createSql.split('\n');
  for (const line of lines) {
    if (rx.test(line)) {
      return line.replace(/,\s*$/, '');
    }
  }
  throw new Error('could not find column definition.');
};

export const removeCommentAnnotationsByType = (
  field: ParsedField,
  a: Annotation
) => {
  const annotations = field.typeAnnotations.filter((c) => c.annotation === a);
  let comment = field.column.Comment;
  annotations.forEach((a) => {
    comment = comment.replace(a.fullAnnotation, '');
  });
  return comment.trim();
};
export const sqlSingleQuoteEscape = (s: string): string => {
  return `'${s.replaceAll(`'`, `''`)}'`;
};
