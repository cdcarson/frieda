import { editAsync } from 'external-editor';

import type { FullSettings } from './types.js';
import { getMysql2Connection } from './database-connections.js';
import { Mysql2QueryError } from './errors.js';
import type {
  DatabaseSchema,
  FieldDefinition,
  ModelDefinition
} from '$lib/api/types.js';
import { getParenthesizedArgs, getStringLiterals } from './parse.js';


const commentRx = /COMMENT\s+(?=["'])("[^"\\]*(?:\\[\s\S][^"\\]*)*"|'[^'\\]*(?:\\[\s\S][^'\\]*)*')/gi;

export const createMigration = async () => {
  return new Promise((resolve, reject) => {
    editAsync('-- new migration\n\n', (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};

export const runMigration = async (settings: FullSettings, sql: string) => {
  const conn = await getMysql2Connection(settings.databaseUrl);
  try {
    await conn.execute(sql);
    await conn.end();
  } catch (error) {
    await conn.end();
    throw new Mysql2QueryError(error);
  }
};

export const getFieldColumnDefinitionSql = (
  schema: DatabaseSchema,
  model: ModelDefinition,
  field: FieldDefinition
): string => {
  const pattern = `\`${field.columnName}\`\\s+${field.knownMySQLType}`;
  const rx = new RegExp(pattern);
  const table = schema.tables.find((t) => t.name === model.tableName);
  if (!table) {
    throw new Error('could not find table');
  }
  const line: string | undefined = table.tableCreateStatement
    .split('\n')
    .find((l) => rx.test(l));
  if (!line) {
    throw new Error('could not find line');
  }
  return line.trim().replace(/,$/, '');
};

export const toggleBooleanType = (origColDef: string, isBoolean: boolean) => {
  const rx = /\btinyint(?:\(\d+\))?/;
  return origColDef.replace(rx, isBoolean ? 'tinyint(1)' : 'tinyint');
};

export const toggleJSONAnnotation = (
  origColDef: string,
  origComment: string,
  jsonType: string|null
): string => {

  let newComment = origComment.replaceAll(/@json\s*(?:\([^\)]*\))?/ig, '')
  if (jsonType) {
    newComment += ` @json(${jsonType})`
  }
  return updateColDefComment(origColDef, newComment);
};

export const toggleBigIntAnnotation = (
  origColDef: string,
  origComment: string,
  isBigInt: boolean
): string => {
  let newComment = origComment.replace(/@bigint/i, '');
  if (isBigInt) {
    newComment += ' @bigint';
  }
  return updateColDefComment(origColDef, newComment);
};

export const updateColDefComment = (
  origColDef: string,
  newComment: string
): string => {
  let commentFound: string | null = null;
  
  
  const without = origColDef.replaceAll(/COMMENT\s+(?=["'])("[^"\\]*(?:\\[\s\S][^"\\]*)*"|'[^'\\]*(?:\\[\s\S][^'\\]*)*')/gi, '')
  
  const trimmedNewComment = newComment.trim();
  if (trimmedNewComment.length === 0) {
    return without
  }
  
  return `${without} COMMENT '${trimmedNewComment}'`;
};
