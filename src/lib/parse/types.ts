import type { ColumnRow, IndexRow } from '../fetch/types.js';
import type { FieldDefinition, SchemaCastMap, TypeOptions } from '../api/types.js';

export const ANNOTATIONS = ['bigint', 'enum', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  fullAnnotation: string;
  annotation: Annotation;
  argument?: string;
};

export type ExtendedSchema = {
  databaseName: string;
  models: ExtendedModelDefinition[];
  cast: SchemaCastMap;
  typeOptions: TypeOptions;
}

export type ExtendedModelDefinition = {
  modelName: string;
  tableName: string;
  fields: ExtendedFieldDefinition[];
  modelTypeDeclaration: string;
  omittedBySelectAllTypeName: string;
  omittedBySelectAllTypeDeclaration: string;
  primaryKeyTypeName: string;
  primaryKeyTypeDeclaration: string;
  createDataTypeName: string;
  createDataTypeDeclaration: string;
  updateDataTypeName: string;
  updateDataTypeDeclaration: string;
  findUniqueParamsTypeName: string;
  findUniqueParamsTypeDeclaration: string;
  dbTypeName: string;
  dbTypeDeclaration: string;
  classGetterName: string;
  indexes: IndexRow[];
  createSql: string;
};

export type ExtendedFieldDefinition = FieldDefinition &
  ColumnRow & {
    // The full field type, including '|null'
    // if the field is nullable.
    javascriptTypePossiblyNull: string;

    // The annotation, if any that was used
    typeAnnotation: ParsedAnnotation | null;

    // Whether the js type has been derived from a type annotation
    isImportedType: boolean;

    // Type declaration in the base model type,
    // including the field name and optionality.
    modelTypeDeclaration: string;

    // Type declaration in the model primary key type,
    // including the field name. This will be null if the field is
    // is not a primary key.
    modelPrimaryKeyTypeDeclaration: string | null;

    // Type declaration in the model create data type,
    // including the field name and optionality.
    // This will be null if the field is generated (indicating
    // that is excluded from the create data type.)
    modelCreateDataTypeDeclaration: string | null;

    // Type declaration in the model update data type,
    // including the field name and optionality.
    // This will be null if the field is generated
    // or is a primary key.
    modelUpdateDataTypeDeclaration: string | null;

    // If the field is unique (and not a primary key)
    // this will be the type of the find unique
    // params corresponding to the field, e.g.:
    // `{email: string}`
    modelFindUniqueParamsType: string | null;
  };
