import camelcase from 'camelcase';
import type { FetchedTable } from './shared.js';
import { getValidJavascriptIdentifier } from './utils.js';
import { Field } from './field.js';

export class Model {
  constructor(public readonly table: FetchedTable) {}

  get tableName(): string {
    return this.table.name;
  }
  get modelName(): string {
    return getValidJavascriptIdentifier(camelcase(this.tableName, {pascalCase: true}));
  }

  get fields(): Field[] {
    return this.table.columns.map(c => new Field(c))
  }
}
