import { it, describe, expect, beforeEach } from 'vitest';
import type { FetchedTable } from '../types.js';
import { parseModelDefinition } from './parse-model-definition.js';
const tableInfoTemplate: FetchedTable = {
  columns: [],
  indexes: [],
  name: '',
  createTableSql: ''
};

describe('parseModelDefinition', () => {
  let tableInfo: FetchedTable;
  beforeEach(() => {
    tableInfo = { ...tableInfoTemplate };
  });
  describe('modelName', () => {
    it('is PascalCase', () => {
      tableInfo.name = 'user_account';
      expect(parseModelDefinition(tableInfo, {}).modelName).toBe('UserAccount');
      tableInfo.name = 'UserAccount';
      expect(parseModelDefinition(tableInfo, {}).modelName).toBe('UserAccount');
    });
  });
  describe('other names', () => {
    it('all of them should be like this', () => {
      tableInfo.name = 'user_account';
      expect(parseModelDefinition(tableInfo, {}).modelPrimaryKeyTypeName).toBe(
        'UserAccountPrimaryKey'
      );
      expect(parseModelDefinition(tableInfo, {}).modelCreateDataTypeName).toBe(
        'UserAccountCreateData'
      );
      expect(parseModelDefinition(tableInfo, {}).modelUpdateDataTypeName).toBe(
        'UserAccountUpdateData'
      );
      expect(
        parseModelDefinition(tableInfo, {}).modelFindUniqueParamsTypeName
      ).toBe('UserAccountFindUniqueParams');
      expect(parseModelDefinition(tableInfo, {}).modelDefinitionConstName).toBe(
        'userAccountModelDefinition'
      );
      expect(parseModelDefinition(tableInfo, {}).classRepoName).toBe(
        'userAccount'
      );
    });
  });
});
