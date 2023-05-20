import {
  getFullTextSearchIndexes,
  getModelCreateDataTypeName,
  getModelFindUniqueTypeName,
  getModelName,
  getModelPrimaryKeyTypeName,
  getModelSelectAllTypeName,
  getModelUpdateDataTypeName
} from '$lib/parse/model-parsers.js';
import kleur from 'kleur';
import type { FetchedTable } from '../fetch/types.js';
import {
  fmtVal,
  fmtVarName,
  formatTypescriptCode,
  squishWords
} from './ui/formatters.js';
import log from './ui/log.js';
import {
  getBigIntAnnotation,
  getCreateModelFieldPresence,
  getFieldName,
  getJavascriptType,
  getModelFieldPresence,
  getMysqlBaseType,
  getSetAnnotation,
  getUpdateModelFieldPresence,
  getValidEnumAnnotation,
  getValidJsonAnnotation,
  isNullable,
  isPrimaryKey,
  isTinyIntOne,
  isUnique
} from '../parse/field-parsers.js';
import type { Column, Index } from '$lib/index.js';
import { DEFAULT_JSON_FIELD_TYPE } from '$lib/constants.js';
import { format } from 'prettier';
import { getModelTypeDeclarations } from '$lib/generate/get-model-type-declarations.js';
import {
  CreateModelFieldPresence,
  ModelFieldPresence,
  UpdateModelFieldPresence
} from '$lib/parse/types.js';

export const showModel = (table: FetchedTable) => {
  log.header(`Model: ${getModelName(table)}`);
  log.info([
    kleur.bold('Model:') + ` ${fmtVal(getModelName(table))}`,
    kleur.dim(`Table name: ${table.name}`)
  ]);
  console.log();
  showModelFields(table);
  console.log();
  const primaryKeys = table.columns.filter((c) => isPrimaryKey(c));
  log.info(
    kleur.bold(`Primary Key${primaryKeys.length !== 1 ? 's' : ''}: `) +
      primaryKeys.map((c) => fmtVarName(getFieldName(c))).join(', ')
  );
  console.log();
  showModelCreateTable(table);
  console.log();
  showBaseModelType(table);
  console.log();
  showSelectAllModelType(table);
  console.log();
  showPrimaryKeyType(table);
  console.log();
  showCreateDataType(table);
  console.log();
  showUpdateDataType(table);
  console.log();
  showFindUniqueType(table)
  console.log();
  showModelIndexes(table);
  console.log();
  showModelSearchIndexes(table);
  log.footer();
};

export const modelPreamble = (table: FetchedTable) => {
  log.info([
    kleur.bold('Model:') + ` ${fmtVal(getModelName(table))}`,
    kleur.dim(`Table name: ${table.name}`)
  ]);
}

export const showModelFields = (table: FetchedTable) => {
  log.info(kleur.bold(`Fields (${table.columns.length})`));

  log.table(
    [
      ...table.columns.map((c) => [
        fmtVarName(getFieldName(c)),
        kleur.dim(c.Type),
        fmtVal(getJavascriptType(c) + (isNullable(c) ? '|null' : '')) +
          ` (${explainJsType(c)})`
      ])
    ],
    ['Field', 'Column Type', 'Javascript Type']
  );
};

export const showModelCreateTable = (table: FetchedTable) => {
  log.info([
    kleur.bold('Create Table: '),
    ...table.createSql.split('\n').map((s) => kleur.red(`${s}`))
  ]);
};

export const showModelIndexes = (table: FetchedTable) => {
  const map = new Map<string, Index>();
  table.indexes.forEach((i) => {
    if (map.get(i.Key_name)) {
      return;
    }
    map.set(i.Key_name, i);
  });
  log.info(kleur.bold(`Indexes (${map.size})`));
  const arr = Array.from(map.values());
  log.table(
    [
      ...arr.map((index) => [
        kleur.red(index.Key_name),
        kleur.gray(index.Index_type),
        fmtVal(JSON.stringify(index.Non_unique === 0))
      ])
    ],
    ['Key', 'Type', 'Unique']
  );
};
export const showModelSearchIndexes = (table: FetchedTable) => {
  const searchIndexes = getFullTextSearchIndexes(table);
  log.info(kleur.bold(`Search Indexes (${searchIndexes.length})`));
  if (searchIndexes.length > 0) {
    log.table(
      [
        ...searchIndexes.map((index) => [
          kleur.red(index.key),
          index.indexedFields.map((k) => fmtVarName(k)).join(', ')
        ])
      ],
      ['Key', 'Indexed Fields']
    );
  }
};

export const explainJsType = (column: Column): string => {
  const mysqlType = getMysqlBaseType(column);
  if (!mysqlType) {
    return `Unhandled column type ${
      column.Type
    }. Typed and cast as javascript ${fmtVal('string')}.`;
  }
  if ('json' === mysqlType) {
    const annotation = getValidJsonAnnotation(column);
    if (!annotation) {
      return `No ${kleur.red(
        '@json'
      )} type annotation. Using default JSON type: ${fmtVal(
        DEFAULT_JSON_FIELD_TYPE
      )}.`;
    }
    return `Using type from the ${kleur.red('@json')} type annotation.`;
  }
  if (isTinyIntOne(column)) {
    return `Default type for ${fmtVal('tinyint(1)')} columns.`;
  }
  if ('bigint' === mysqlType) {
    if (getBigIntAnnotation(column)) {
      return `Found  ${kleur.red('@bigint')} type annotation.`;
    }
    return `Default type for ${fmtVal('bigint')} columns.`;
  }
  if ('enum' === mysqlType) {
    const annotation = getValidEnumAnnotation(column);
    if (annotation) {
      return `Using type from the ${kleur.red('@enum')} type annotation.`;
    }
    return `Using the column's enum definition.`;
  }

  if ('set' === mysqlType) {
    const annotation = getSetAnnotation(column);
    if (annotation) {
      if (annotation.argument && annotation.argument.trim().length > 0) {
        return `Using type from the ${kleur.red('@set')} type annotation.`;
      }
      return `Using the ${kleur.red('@set')} type annotation.`;
    }
  }

  return `Default type for ${fmtVal(mysqlType)} columns.`;
};

export const showBaseModelType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    The base representation of the model. 
    Fields where the underlying column is INVISIBLE are optional.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes: string[] = table.columns
    .filter(
      (c) =>
        getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
    )
    .map((c) => {
      return `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
        getModelName(table)
      )}. ${kleur.dim('(Column is INVISIBLE.)')}`;
    });

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }

  log.info([
    kleur.bold('Model Type:') + ' ' + fmtVal(getModelName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.model),
    ...notes
  ]);
};

export const showSelectAllModelType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    The representation of the model when fetched using 'SELECT *'. 
    Fields where the underlying column is INVISIBLE are omitted.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));

  const notes: string[] = table.columns
    .filter(
      (c) =>
        getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
    )
    .map((c) => {
      return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
        getModelSelectAllTypeName(table)
      )}. ${kleur.dim('(Column is INVISIBLE.)')}`;
    });

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }
  log.info([
    kleur.bold('Select * Type:') +
      ' ' +
      fmtVal(getModelSelectAllTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.selectAll),
    ...notes
  ]);
};

export const showPrimaryKeyType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  log.info([
    kleur.bold('Primary Key Type:') +
      ' ' +
      fmtVal(getModelPrimaryKeyTypeName(table)),
    ...squishWords(
      kleur.dim(`Used to select, update and delete models.`)
    ).split('\n'),
    ...formatTypescriptCode(typeDecls.primaryKey)
  ]);
};

export const showCreateDataType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    Data passed to create a new ${getModelName(table)}.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes = table.columns
    .map((c) => {
      const p = getCreateModelFieldPresence(c);
      if (p === CreateModelFieldPresence.omittedGenerated) {
        return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
          getModelCreateDataTypeName(table)
        )}. ${kleur.dim('(Column is GENERATED.)')}`;
      }
      if (p === CreateModelFieldPresence.optionalAutoIncrement) {
        return `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
          getModelCreateDataTypeName(table)
        )}. ${kleur.dim('(Column is auto_increment.)')}`;
      }
      if (p === CreateModelFieldPresence.optionalHasDefault) {
        return `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
          getModelCreateDataTypeName(table)
        )}. ${kleur.dim('(Column has default value.)')}`;
      }
      return '';
    })
    .filter((s) => s.length > 0);

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }
  log.info([
    kleur.bold('Create Data Type:') +
      ' ' +
      fmtVal(getModelCreateDataTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.createData),
    ...notes
  ]);
};

export const showUpdateDataType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    Data passed to update an existing ${getModelName(table)}.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes = table.columns
    .map((c) => {
      const p = getUpdateModelFieldPresence(c);
      if (p === UpdateModelFieldPresence.omittedGenerated) {
        return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
          getModelUpdateDataTypeName(table)
        )}. ${kleur.dim('(Column is GENERATED.)')}`;
      }
      if (p === UpdateModelFieldPresence.omittedPrimaryKey) {
        return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
          getModelUpdateDataTypeName(table)
        )}. ${kleur.dim('(Column is primary key.)')}`;
      }

      return '';
    })
    .filter((s) => s.length > 0);

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }
  log.info([
    kleur.bold('Update Data Type:') +
      ' ' +
      fmtVal(getModelUpdateDataTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.updateData),
    ...notes
  ]);
};

export const showFindUniqueType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    The various ways you can select a unique ${getModelName(table)}.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes = table.columns
    .filter((c) => isUnique(c))
    .map((c) => {
      return `- ${fmtVarName(getFieldName(c))} is unique. ${kleur.dim(
        '(Key: UNI)'
      )}`;
    });

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }

  log.info([
    kleur.bold('Find Unique Type:') +
      ' ' +
      fmtVal(getModelFindUniqueTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.findUniqueParams),
    ...notes
  ]);
};
