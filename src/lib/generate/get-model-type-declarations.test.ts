import { describe, it, expect, beforeEach } from 'vitest';
import type { Table, TypeOptions } from '../api/types.js';
import { getModelTypeDeclarations } from './get-model-type-declarations.js';

describe('getModelTypeDeclarations', () => {
  let table: Table;
  let options: Partial<TypeOptions>;
  beforeEach(() => {
    options = {};
    table = {
      columns: [
        {
          Field: 'id',
          Collation: '',
          Comment: '',
          Default: null,
          Extra: '',
          Key: 'PRI',
          Null: 'NO',
          Privileges: '',
          Type: 'bigint unsigned'
        },
        {
          Field: 'test',
          Collation: '',
          Comment: '',
          Default: null,
          Extra: '',
          Key: '',
          Null: 'NO',
          Privileges: '',
          Type: 'text'
        }
      ],
      indexes: [],
      name: 'foo_bar'
    };
  });
  it('create the named types', () => {
    const types = getModelTypeDeclarations(table, options);
    expect(types.model).toContain('export type FooBar');
    expect(types.omittedBySelectAll).toContain(
      'export type FooBarOmittedBySelectAll'
    );
    expect(types.createData).toContain('export type FooBarCreateData');
    expect(types.updateData).toContain('export type FooBarUpdateData');
    expect(types.findUniqueParams).toContain(
      'export type FooBarFindUniqueParams'
    );
    expect(types.primaryKey).toContain('export type FooBarPrimaryKey');
    expect(types.db).toContain('export type FooBarModelDb');
  });
  it('creates the model type with all the fields', () => {
    const types = getModelTypeDeclarations(table, options);
    expect(types.model).toContain('id:string');
    expect(types.model).toContain('test:string');
  });
  it('deals with invisible columns in the base model', () => {
    table.columns[1].Extra = 'INVISIBLE';
    const types = getModelTypeDeclarations(table, options);
    expect(types.model).toContain('test?:string');
  });
  it('deals with nullable columns in the base model', () => {
    table.columns[1].Null = 'YES';
    const types = getModelTypeDeclarations(table, options);
    expect(types.model).toContain('test:string|null');
  });
  it('deals with nullable columns with default null in the base model', () => {
    table.columns[1].Null = 'YES';
    table.columns[1].Default = null;
    const types = getModelTypeDeclarations(table, options);
    expect(types.model).toContain('test:string|null');
  });
  it('deals with generated columns in the create type', () => {
    table.columns[1].Extra = 'VIRTUAL GENERATED';
    const types = getModelTypeDeclarations(table, options);
    expect(types.createData).not.toContain('test:string');
    table.columns[1].Extra = '';

    const types2 = getModelTypeDeclarations(table, options);
    expect(types2.createData).toContain('test:string');
  });
  it('deals with nullable columns in the create type', () => {
    table.columns[1].Null = 'YES';
    const types = getModelTypeDeclarations(table, options);
    expect(types.createData).toContain('test?:string|null');
    table.columns[1].Null = 'NO';
    const types2 = getModelTypeDeclarations(table, options);
    expect(types2.createData).toContain('test:string');
    expect(types2.createData).not.toContain('test?:string|null');
  });
  it('deals with columns with default in the create type', () => {
    table.columns[1].Null = 'NO';
    table.columns[1].Default = 'ho';
    const types = getModelTypeDeclarations(table, options);
    expect(types.createData).toContain('test?:string');
    table.columns[1].Null = 'NO';
    table.columns[1].Default = null;
    const types2 = getModelTypeDeclarations(table, options);
    expect(types2.createData).toContain('test:string');
    expect(types2.createData).not.toContain('test?:string');
  });
  it('deals with nullable columns in the update type', () => {
    table.columns[1].Null = 'YES';
    const types = getModelTypeDeclarations(table, options);
    expect(types.updateData).toContain('test?:string|null');
    table.columns[1].Null = 'NO';
    const types2 = getModelTypeDeclarations(table, options);
    expect(types2.updateData).toContain('test?:string');
    expect(types2.updateData).not.toContain('test?:string|null');
  });
  it('deals with generated columns in the update type', () => {
    table.columns[1].Extra = 'VIRTUAL GENERATED';
    const types = getModelTypeDeclarations(table, options);
    expect(types.updateData).not.toContain('test');
    table.columns[1].Extra = '';
    const types2 = getModelTypeDeclarations(table, options);
    expect(types2.updateData).toContain('test?:string');
  });
  it('includes the primary key in find unique type', () => {
    const types = getModelTypeDeclarations(table, options);
    expect(types.findUniqueParams).toContain('FooBarPrimaryKey');
  });
  it('includes other unique fields in find unique type', () => {
    table.columns[1].Key = 'UNI';
    const types = getModelTypeDeclarations(table, options);
    expect(types.findUniqueParams).toContain('FooBarPrimaryKey|{test:string}');
  });
});
