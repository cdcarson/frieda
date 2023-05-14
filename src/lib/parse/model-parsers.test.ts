import type { Table } from '$lib/index.js';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getModelClassGetterName,
  getModelCreateDataTypeName,
  getModelDbTypeName,
  getModelFindUniqueParamsTypeName,
  getModelName,
  getModelOmittedBySelectAllTypeName,
  getModelPrimaryKeyTypeName,
  getModelUpdateDataTypeName
} from './model-parsers.js';

describe('model-parsers', () => {
  let table: Table;
  beforeEach(() => {
    table = {
      columns: [],
      indexes: [],
      name: 'foo_bar'
    };
  });
  it('naming', () => {
    expect(getModelName(table)).toBe('FooBar');
    table.name = 'FooBar';
    expect(getModelName(table)).toBe('FooBar');
    expect(getModelOmittedBySelectAllTypeName(table)).toBe(
      'FooBarOmittedBySelectAll'
    );
    expect(getModelPrimaryKeyTypeName(table)).toBe('FooBarPrimaryKey');
    expect(getModelCreateDataTypeName(table)).toBe('FooBarCreateData');
    expect(getModelUpdateDataTypeName(table)).toBe('FooBarUpdateData');
    expect(getModelFindUniqueParamsTypeName(table)).toBe(
      'FooBarFindUniqueParams'
    );
    expect(getModelDbTypeName(table)).toBe('FooBarModelDb');
    expect(getModelClassGetterName(table)).toBe('fooBar');
  });
});
