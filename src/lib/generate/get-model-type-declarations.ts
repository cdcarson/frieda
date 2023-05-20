import type { Table } from '$lib/index.js';
import {
  getJavascriptType,
  isPrimaryKey,
  getFieldName,
  getModelFieldPresence,
  isNullable,
  getCreateModelFieldPresence,
  getUpdateModelFieldPresence,
  isUnique
} from '../parse/field-parsers.js';
import {
  getModelCreateDataTypeName,
  getModelDbTypeName,
  getModelPrimaryKeyTypeName,
  getModelUpdateDataTypeName,
  getModelFindUniqueTypeName,
  getModelName,
  getModelSelectAllTypeName
} from '../parse/model-parsers.js';
import {
  ModelFieldPresence,
  CreateModelFieldPresence,
  UpdateModelFieldPresence
} from '../parse/types.js';

export const getModelTypeDeclarations = (
  table: Table
): {
  model: string;
  selectAll: string;
  primaryKey: string;
  createData: string;
  updateData: string;
  findUniqueParams: string;
  db: string;
} => {
  const columnInfo = table.columns.map((column) => {
    return {
      column,
      javascriptType: getJavascriptType(column),
      name: getFieldName(column),
      isNullable: isNullable(column),
      modelPresence: getModelFieldPresence(column),
      createPresence: getCreateModelFieldPresence(column),
      updatePresence: getUpdateModelFieldPresence(column),
      isUnique: isUnique(column)
    };
  });
  return {
    model: `export type ${getModelName(table)}={${columnInfo
      .map((o) => {
        const opt =
          o.modelPresence === ModelFieldPresence.undefinedForSelectAll
            ? '?'
            : '';
        const orNull = o.isNullable ? '|null' : '';
        return `${o.name}${opt}:${o.javascriptType}${orNull}`;
      })
      .join(';')}}`,
    selectAll: `export type ${getModelSelectAllTypeName(table)}={${columnInfo
      .filter(
        (o) => o.modelPresence !== ModelFieldPresence.undefinedForSelectAll
      )
      .map((o) => {
        const orNull = o.isNullable ? '|null' : '';
        return `${o.name}:${o.javascriptType}${orNull}`;
      })
      .join(';')}}`,
    primaryKey: `export type ${getModelPrimaryKeyTypeName(table)}={${columnInfo
      .filter((o) => isPrimaryKey(o.column))
      .map((o) => {
        return `${o.name}:${o.javascriptType}`;
      })
      .join(';')}}`,
    createData: `export type ${getModelCreateDataTypeName(table)}={${columnInfo
      .filter(
        (o) => o.createPresence !== CreateModelFieldPresence.omittedGenerated
      )
      .map((o) => {
        const opt =
          o.createPresence !== CreateModelFieldPresence.required ? '?' : '';
        const orNull = o.isNullable ? '|null' : '';
        return `${o.name}${opt}:${o.javascriptType}${orNull}`;
      })
      .join(';')}}`,
    updateData: `export type ${getModelUpdateDataTypeName(table)}={${columnInfo
      .filter((o) => o.updatePresence === UpdateModelFieldPresence.optional)
      .map((o) => {
        // all fields are optional
        const opt = '?';
        const orNull = o.isNullable ? '|null' : '';
        return `${o.name}${opt}:${o.javascriptType}${orNull}`;
      })
      .join(';')}}`,
    findUniqueParams: `export type ${getModelFindUniqueTypeName(table)}=${[
      getModelPrimaryKeyTypeName(table),
      ...columnInfo
        .filter((o) => o.isUnique)
        .map((o) => {
          return `{${o.name}:${o.javascriptType}}`;
        })
    ].join('|')}`,
    db: `export type ${getModelDbTypeName(table)}=ModelDb<${[
      getModelName(table),
      getModelSelectAllTypeName(table),
      getModelPrimaryKeyTypeName(table),
      getModelCreateDataTypeName(table),
      getModelUpdateDataTypeName(table),
      getModelFindUniqueTypeName(table)
    ].join(',')}>`
  };
};
