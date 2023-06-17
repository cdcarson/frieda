import type { CastType, MysqlBaseType } from '$lib/index.js';

export type AddFieldFormData = {
  name: string;
  mysqlBaseType: MysqlBaseType;
  unsigned: boolean;
  nullable: 'NULL' | 'NOT NULL'
  typeTinyIntAs: 'boolean'|'int';
  defaultValue: undefined|null|string
};
