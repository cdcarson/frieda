import type { DatabaseShowColumnsRow } from '../types.js';

export const hasColumnCommentAnnotation = (
  annotation: string,
  col: DatabaseShowColumnsRow
): boolean => {
  const rx = new RegExp(`(\\s|^)@${annotation}(\\s|\\(|$)`, 'i');
  return rx.test(col.Comment);
};
