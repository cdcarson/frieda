import type { FieldDefinition } from '$lib/api/types';

export const getFieldTypeForModelType = (field: FieldDefinition): string => {
  const def =
    field.fieldName +
    (field.isOmittableInModel ? '?' : '') +
    ': ' +
    field.javascriptType +
    (field.isNullable ? ' | null' : '') +
    ';';
  const lines: string[] = [def];
  if (field.isOmittableInModel) {
    lines.unshift(
      `/** not included in model by default unless column is selected explicitly  (column marked as INVISIBLE) */`
    )
  }

  return lines.join('\n');
};
