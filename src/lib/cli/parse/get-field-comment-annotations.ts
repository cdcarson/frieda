import type { Annotation, DatabaseShowFullColumnsRow, ParsedAnnotation } from "../types.js";

export const getFieldCommentAnnotations = (
  column: DatabaseShowFullColumnsRow
): ParsedAnnotation[] => {
  const rx = /(?:^|\s+)@(bigint|enum|set|json)(?:\((.*)\))?/gi;
  const result = Array.from(column.Comment.matchAll(rx)).map((r) => {
    return {
      annotation: r[1].toLowerCase() as Annotation,
      argument: r[2]
    };
  });
  return result;
};
