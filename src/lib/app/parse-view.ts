import camelcase from 'camelcase';
import type { FetchedView, ParsedView } from './types.js';
import { getValidJavascriptIdentifier } from './utils.js';
import { parseField } from './parse-field.js';

export const parseView = (view: FetchedView): ParsedView => {
  const tableName = view.name;
  const modelName = getValidJavascriptIdentifier(
    camelcase(tableName, { pascalCase: true })
  );

  const selectAllTypeName = `${modelName}SelectAll`;
  const dbTypeName = `${modelName}Db`;
  const appDbKey = getValidJavascriptIdentifier(camelcase(tableName));
  const fields = view.columns.map((c) => parseField(c));

  return {
    view,
    tableName,
    modelName,
    selectAllTypeName,
    dbTypeName,
    appDbKey,
    fields
  };
};
