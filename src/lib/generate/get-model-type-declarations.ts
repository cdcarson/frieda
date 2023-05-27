import type { Table } from '$lib/index.js';
import { blockComment } from '$lib/utils/block-comment.js';
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
  getModelSelectAllTypeName,
  getModelClassGetterName
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
  
  return {
    model: getBaseModelTypeDecl(table),
    selectAll: getModelSelectAllDecl(table),
    primaryKey: getModelPrimaryKeyDecl(table),
    createData: getModelCreateDataDecl(table),
    updateData: getModelUpdateDataDecl(table),
    findUniqueParams: getFindUniqueDecl(table),
    db: `
    /**
     * The type for a \`${getModelName(table)}\` model database.
     */
    export type ${getModelDbTypeName(table)}=ModelDb<${[
      getModelName(table),
      getModelSelectAllTypeName(table),
      getModelPrimaryKeyTypeName(table),
      getModelCreateDataTypeName(table),
      getModelUpdateDataTypeName(table),
      getModelFindUniqueTypeName(table)
    ].join(',')}>`
  };
};

const getBaseModelTypeDecl = (table: Table) => {
  const modelName = getModelName(table);
  const comment = [
    `The base representation of a row in the ${table.name} table.`,
    `Fields where the underlying column is \`INVISIBLE\` are optional`,
    `since they will not be included in queries using \`SELECT *\`.`,
    ...table.columns
      .filter(
        (c) =>
          getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is optional in the \`${modelName}\` type (column is \`INVISIBLE\`.)`;
      })
  ];
  const fields = table.columns
    .map((c) => {
      const opt =
        getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
          ? '?'
          : '';
      const orNull = isNullable(c) ? '|null' : '';
      return `${getFieldName(c)}${opt}:${getJavascriptType(c)}${orNull}`;
    })
    .join(';\n');
  return `
    ${blockComment(comment)}
    export type ${modelName} = {
      ${fields}
    }
  `;
};

const getModelSelectAllDecl = (table: Table) => {
  const modelName = getModelName(table);
  const comment = [
    `The representation of the \`${modelName}\` model when fetched using \`SELECT *\`.`,
    `Fields where the underlying column is \`INVISIBLE\` are omitted`,
    `since they will not be included in queries using \`SELECT *\`.`,
    ...table.columns
      .filter(
        (c) =>
          getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is omitted in the \`${getModelSelectAllTypeName(
          table
        )}\` type (column is \`INVISIBLE\`.)`;
      })
  ];
  const fields = table.columns
    .filter(
      (c) =>
        getModelFieldPresence(c) !== ModelFieldPresence.undefinedForSelectAll
    )
    .map((c) => {
      const orNull = isNullable(c) ? '|null' : '';
      return `${getFieldName(c)}:${getJavascriptType(c)}${orNull}`;
    })
    .join(';\n');
  return `
    ${blockComment(comment)}
    export type ${getModelSelectAllTypeName(table)} = {
      ${fields}
    }
  `;
};

const getModelPrimaryKeyDecl = (table: Table) => {
  const modelName = getModelName(table);
  const comment = [
    `Primary keys for the \`${modelName}\` model.`,
    `This type is used to update and delete models, and is the return type`,
    `of \`AppDb.${getModelClassGetterName(table)}.create()\`.`,
    ...table.columns
      .filter(
        (c) =>
          getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is omitted in the \`${getModelSelectAllTypeName(
          table
        )}\` type (column is \`INVISIBLE\`.)`;
      })
  ];

  const fields = table.columns
    .filter((c) => isPrimaryKey(c))
    .map((c) => {
      return `${getFieldName(c)}:${getJavascriptType(c)}`;
    })
    .join(';\n');
  return `
    ${blockComment(comment)}
    export type ${getModelPrimaryKeyTypeName(table)} = {
      ${fields}
    }
  `;
};

const getModelCreateDataDecl = (table: Table) => {
  const modelName = getModelName(table);
  const comment = [
    `Data pasded to create a new \`${modelName}\` model.`,
    `Fields where the underlying column is\`auto_increment\` or has a default value ar optional.`,
    `Fields where the underlying column is \`GENERATED\` are omitted.`,

    ...table.columns
      .filter(
        (c) =>
          getCreateModelFieldPresence(c) ===
          CreateModelFieldPresence.optionalAutoIncrement
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is optional in the \`${getModelCreateDataTypeName(
          table
        )}\` type (column is \`auto_increment\`.)`;
      }),
    ...table.columns
      .filter(
        (c) =>
          getCreateModelFieldPresence(c) ===
          CreateModelFieldPresence.omittedGenerated
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is omitted in the \`${getModelCreateDataTypeName(
          table
        )}\` type (column is \`GENERATED\`.)`;
      }),
    ...table.columns
      .filter(
        (c) =>
          getCreateModelFieldPresence(c) ===
          CreateModelFieldPresence.optionalHasDefault
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is optional in the \`${getModelCreateDataTypeName(
          table
        )}\` type (column has a default value.)`;
      })
  ];

  const fields = table.columns
    .filter(
      (c) =>
        getCreateModelFieldPresence(c) !==
        CreateModelFieldPresence.omittedGenerated
    )
    .map((c) => {
      const opt =
        getCreateModelFieldPresence(c) !== CreateModelFieldPresence.required
          ? '?'
          : '';
      const orNull = isNullable(c) ? '|null' : '';
      return `${getFieldName(c)}${opt}:${getJavascriptType(c)}${orNull}`;
    })
    .join(';\n');
  return `
    ${blockComment(comment)}
    export type ${getModelCreateDataTypeName(table)} = {
      ${fields}
    }
  `;
};

const getModelUpdateDataDecl = (table: Table) => {
  const modelName = getModelName(table);
  const comment = [
    `Data paseed to update an existing \`${modelName}\` model.`,
    `Primary keys are omitted.`,
    `Fields where the underlying column is \`GENERATED\` are omitted.`,

    ...table.columns
      .filter(
        (c) =>
          getUpdateModelFieldPresence(c) ===
          UpdateModelFieldPresence.omittedPrimaryKey
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is omitted in the \`${getModelUpdateDataTypeName(
          table
        )}\` type (column is a primary key.)`;
      }),
    ...table.columns
      .filter(
        (c) =>
          getUpdateModelFieldPresence(c) ===
          UpdateModelFieldPresence.omittedGenerated
      )
      .map((c) => {
        return `- The field \`${getFieldName(
          c
        )}\` is omitted in the \`${getModelUpdateDataTypeName(
          table
        )}\` type (column is \`GENERATED\`.)`;
      })
  ];

  const fields = table.columns
    .filter(
      (c) =>
        getUpdateModelFieldPresence(c) === UpdateModelFieldPresence.optional
    )
    .map((c) => {
      const orNull = isNullable(c) ? '|null' : '';
      return `${getFieldName(c)}?:${getJavascriptType(c)}${orNull}`;
    })
    .join(';\n');
  return `
    ${blockComment(comment)}
    export type ${getModelUpdateDataTypeName(table)} = {
      ${fields}
    }
  `;
};

const getFindUniqueDecl = (table: Table) => {
  const modelName = getModelName(table);
  const primaryKeyName = getModelPrimaryKeyTypeName(table);
  const comment = [
    `Type representing how to uniquely select a \`${modelName}\` model`,
    `including the \`${primaryKeyName}\` primary key type.`,
    ...table.columns.filter(c => isUnique(c)).map(c => {
      return `- The field \`${getFieldName(
        c
      )}\` has a unique index.`;
    })
  ]
  const types =  table.columns.filter(c => isUnique(c)).map(c => {
    return `{${getFieldName(c)}:${getJavascriptType(c)}}`
  })
  types.unshift(primaryKeyName);
  return `
    ${blockComment(comment)}
    export type ${getModelFindUniqueTypeName(table)} = ${types.join('|')}
  `;
}
