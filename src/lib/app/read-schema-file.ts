import { SCHEMA_D_TS_FILENAME } from './constants.js';
import type { Options } from './options.js';
import { join } from 'node:path';
import { ast, query } from '@phenomnomnominal/tsquery';
import type ts from 'typescript';
import fs from 'fs-extra';
import type { SchemaField, SchemaModel } from './types.js';
import { fmtPath, log, onUserCancelled, prompt, squishWords } from './utils.js';
import prettier from 'prettier';
import highlight from 'cli-highlight';
import ora from 'ora';

export const readSchemaFile = async (
  options: Options
): Promise<SchemaModel[]> => {
  const relPath = join(options.outputDirectory, SCHEMA_D_TS_FILENAME);
  const readSpinner = ora(`Reading ${fmtPath(relPath)}`).start();

  const models: SchemaModel[] = [];
  const pathToSchemaFile = join(
    options.outputDirectoryAbsolutePath,
    SCHEMA_D_TS_FILENAME
  );

  let fileContents = '';
  const exists = await fs.exists(pathToSchemaFile);
  if (exists) {
    fileContents = await fs.readFile(pathToSchemaFile, 'utf8');
    readSpinner.succeed(`${fmtPath(relPath)} read.`);
  } else {
    readSpinner.info(`${fmtPath(relPath)} not found.`);
  }
  if (fileContents.trim().length === 0) {
    return models;
  }
  const schemaAst = ast(fileContents);

  const importDeclarations = query(schemaAst, 'ImportDeclaration');
  if (importDeclarations.length > 0) {
    log.error([
      ...squishWords(
        `Top level import declaration(s) found in ${fmtPath(
          join(options.outputDirectory, SCHEMA_D_TS_FILENAME)
        )}. Such imports cannot be preserved. Please use import types instead to refer to external types. Example:`
      ).split('\n'),
      '',
      ...highlight
        .highlight(
          prettier.format(
            `
        type MyModel = {
          // import from project
          foo: import('../api.js').Foo;
          // import from a library
          stripeCustomer: import('stripe').Stripe.Customer
        }
    `.trim(),
            { filepath: 'ex.ts', printWidth: 40, singleQuote: true, semi: true }
          ),
          { language: 'ts' }
        )
        .split('\n')
    ]);
    const continueAnyway = await prompt({
      type: 'confirm',
      name: 'continueAnyway',
      message: 'Continue anyway?'
    });
    if (!continueAnyway) {
      return onUserCancelled();
    }
  }

  const nodes = query(schemaAst, 'TypeAliasDeclaration');

  for (const node of nodes) {
    const typeLiteral: ts.TypeLiteralNode | undefined =
      query<ts.TypeLiteralNode>(node, 'TypeLiteral')[0];
    if (!typeLiteral) {
      continue;
    }

    const identifier: ts.Identifier | undefined = query<ts.Identifier>(
      node,
      'Identifier'
    )[0];
    if (!identifier) {
      continue;
    }
    const modelName = identifier.getText().trim();
    if (modelName.length === 0) {
      continue;
    }
    const propertySignatures = query<ts.PropertySignature>(
      typeLiteral,
      'PropertySignature'
    ).filter((ps) => ps.parent === typeLiteral);

    if (propertySignatures.length === 0) {
      continue;
    }

    const model: SchemaModel = {
      modelName,
      fields: []
    };
    for (const sig of propertySignatures) {
      if (!sig.name) {
        continue;
      }
      if (!sig.type) {
        continue;
      }
      const javascriptType = sig.type.getText().trim();

      const field: SchemaField = {
        fieldName: sig.name.getText().trim(),
        javascriptType
      };

      if (field.fieldName.length === 0 || field.javascriptType.length === 0) {
        continue;
      }

      model.fields.push(field);
    }

    models.push(model);
  }

  return models;
};
