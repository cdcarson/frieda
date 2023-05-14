export enum ModelFieldPresence {
  present = 'present',
  undefinedForSelectAll = 'undefined for select * (column is INVISIBLE)'
}
export enum CreateModelFieldPresence {
  omittedGenerated = 'omitted (column is GENERATED)',
  optionalAutoIncrement = 'optional (column is auto_increment)',
  optionalHasDefault = 'optional (column has default value)',
  required = 'required'
}

export enum UpdateModelFieldPresence {
  omittedGenerated = 'omitted (column is GENERATED)',
  omittedPrimaryKey = 'omitted (column is primary key)',
  optional = 'optional'
}

export const ANNOTATIONS = ['bigint', 'enum', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  fullAnnotation: string;
  annotation: Annotation;
  argument?: string;
};
