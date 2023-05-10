import type { FieldDefinition, ModelDefinition } from '$lib/index.js';
import { getModelNames } from '../parse/get-model-names.js';
import { fmtVal, fmtVarName } from './formatters.js';

export const getFieldNotes = (
  m: ModelDefinition,
  f: FieldDefinition
): string[] => {
  const notes: string[] = [];
  const { modelUpdateDataTypeName, modelCreateDataTypeName } = getModelNames(
    m.tableName
  );
  if (f.isInvisible) {
    notes.push(
      fmtVarName(f.fieldName) +
        ' is INVISIBLE. It will be undefined in the model using SELECT *. You must select it by name.'
    );
  }
  if (f.isAlwaysGenerated) {
    notes.push(
      `${fmtVarName(
        f.fieldName
      )} is GENERATED. It is omitted from the ${fmtVal(
        modelCreateDataTypeName
      )} or ${modelUpdateDataTypeName} types.`
    );
  }
  if (f.isAutoIncrement) {
    notes.push(
      `${fmtVarName(
        f.fieldName
      )} is auto_increment. It is optional in the ${fmtVal(
        modelCreateDataTypeName
      )} type and omitted from the ${fmtVal(
        modelUpdateDataTypeName
      )} type.`
    )
  }
  if (f.hasDefault) {
    notes.push(
      `${fmtVarName(
        f.fieldName
      )} has a default. It is optional in the ${fmtVal(
        modelCreateDataTypeName
      )} type.`
    )
  }
 
  
  return notes;
};
