import type { DatabaseShowFullColumnsRow } from "$lib/cli/types.js";
import type { FieldDefinition } from "$lib/index.js";

export const ANNOTATIONS = ['bigint', 'enum', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  annotation: Annotation;
  argument?: string;
};

export type FullFieldDefinition = FieldDefinition &
  DatabaseShowFullColumnsRow & {
    // The full field type, including '|null'
    // if the field is nullable.
    javasscriptTypeString: string;

    // An explanation of how the javasscriptTypeString was inferred.
    javascriptTypeNote: string;

    // The annotation, if any that was used
    typeAnnotation: ParsedAnnotation | null;

    // Type declaration in the base model type,
    // including the field name and optionality.
    modelTypeDeclaration: string;

    // A note about how modelTypeDeclaration was inferred.
    modelTypeNote: string;

    // Type declaration in the model primary key type,
    // including the field name. This will be null if the field is
    // is not a primary key.
    modelPrimaryKeyTypeDeclaration: string | null;

    // Type declaration in the model create data type,
    // including the field name and optionality.
    // This will be null if the field is generated (indicating
    // that is excluded from the create data type.)
    modelCreateDataTypeDeclaration: string | null;

    // A note about how modelCreateDataTypeDeclaration was inferred.
    modelCreateDataTypeNote: string;

    // Type declaration in the model update data type,
    // including the field name and optionality.
    // This will be null if the field is generated
    // or is a primary key.
    modelUpdateDataTypeDeclaration: string | null;

    // A note about how modelUpdateDataTypeNote was inferred.
    modelUpdateDataTypeNote: string;

    // If the field is unique (and not a primary key)
    // this will be the type of the find unique
    // params corresponding to the field, e.g.:
    // `{email: string}`
    modelFindUniqueParamsType: string | null;

    // A note about how modelFindUniqueParamsType was inferred.
    modelFindUniqueParamsNote: string;
  };