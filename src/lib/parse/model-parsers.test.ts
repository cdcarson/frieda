import type { Table } from '$lib/index.js';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getModelClassGetterName,
  getModelCreateDataTypeName,
  getModelDbTypeName,
  getModelFindUniqueTypeName,
  getModelName,
  getModelPrimaryKeyTypeName,
  getModelUpdateDataTypeName,
  getFullTextSearchIndexes,
  getModelSelectAllTypeName
} from './model-parsers.js';
import type { FetchedTable } from '$lib/fetch/types.js';

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
    expect(getModelSelectAllTypeName(table)).toBe('FooBarSelectAll');
    expect(getModelPrimaryKeyTypeName(table)).toBe('FooBarPrimaryKey');
    expect(getModelCreateDataTypeName(table)).toBe('FooBarCreateData');
    expect(getModelUpdateDataTypeName(table)).toBe('FooBarUpdateData');
    expect(getModelFindUniqueTypeName(table)).toBe('FooBarFindUnique');
    expect(getModelDbTypeName(table)).toBe('FooBarModelDb');
    expect(getModelClassGetterName(table)).toBe('fooBar');
  });
});

describe('getFullTextSearchIndexes', () => {
  let table: FetchedTable;
  beforeEach(() => {
    table = {
      columns: [],
      indexes: [],
      name: 'foo_bar',
      createSql: ''
    };
  });
  it('works', () => {
    table.indexes = [
      {
        Table: 'Publication',
        Non_unique: 0,
        Key_name: 'PRIMARY',
        Seq_in_index: 1,
        Column_name: 'id',
        Collation: 'A',
        Cardinality: '0',
        Sub_part: null,
        Packed: null,
        Null: '',
        Index_type: 'BTREE',
        Comment: '',
        Index_comment: '',
        Visible: 'YES',
        Expression: null
      },
      {
        Table: 'Publication',
        Non_unique: 1,
        Key_name: 'Publication_name_tagline_organizationName_description_idx',
        Seq_in_index: 1,
        Column_name: 'name',
        Collation: null,
        Cardinality: '0',
        Sub_part: null,
        Packed: null,
        Null: '',
        Index_type: 'FULLTEXT',
        Comment: '',
        Index_comment: '',
        Visible: 'YES',
        Expression: null
      },
      {
        Table: 'Publication',
        Non_unique: 1,
        Key_name: 'Publication_name_tagline_organizationName_description_idx',
        Seq_in_index: 2,
        Column_name: 'tagline',
        Collation: null,
        Cardinality: '0',
        Sub_part: null,
        Packed: null,
        Null: 'YES',
        Index_type: 'FULLTEXT',
        Comment: '',
        Index_comment: '',
        Visible: 'YES',
        Expression: null
      },
      {
        Table: 'Publication',
        Non_unique: 1,
        Key_name: 'Publication_name_tagline_organizationName_description_idx',
        Seq_in_index: 3,
        Column_name: 'organizationName',
        Collation: null,
        Cardinality: '0',
        Sub_part: null,
        Packed: null,
        Null: '',
        Index_type: 'FULLTEXT',
        Comment: '',
        Index_comment: '',
        Visible: 'YES',
        Expression: null
      },
      {
        Table: 'Publication',
        Non_unique: 1,
        Key_name: 'Publication_name_tagline_organizationName_description_idx',
        Seq_in_index: 4,
        Column_name: 'description',
        Collation: null,
        Cardinality: '0',
        Sub_part: null,
        Packed: null,
        Null: 'YES',
        Index_type: 'FULLTEXT',
        Comment: '',
        Index_comment: '',
        Visible: 'YES',
        Expression: null
      }
    ];
    expect(getFullTextSearchIndexes(table).length).toBe(1);
  });
});
