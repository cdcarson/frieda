import { ast, query } from '@phenomnomnominal/tsquery';
import type ts from 'typescript';
import type { SchemaField, SchemaModel } from './types.js';
import { fmtPath, log, onUserCancelled, prompt, squishWords } from './utils.js';
import prettier from 'prettier';
import highlight from 'cli-highlight';
import ora from 'ora';
import { FilesIO } from './files-io.js';
import type { Options } from './options.js';

export const readSchemaDefinitionFile = async (
  options: Options
): Promise<SchemaModel[]> => {
  const files = FilesIO.get();
  const relPath = options.modelDefinitionFilePath;
  const readSpinner = ora(`Reading ${fmtPath(relPath)}`).start();
  const { exists, contents } = await files.read(
    options.modelDefinitionFilePath
  );
  readSpinner.succeed();
  const models: SchemaModel[] = [];

  if (!exists || contents.trim().length === 0) {
    return models;
  }
  const schemaAst = ast(contents);

  const importDeclarations = query(schemaAst, 'ImportDeclaration');
  if (importDeclarations.length > 0) {
    log.error([
      ...squishWords(
        `Top level import declaration(s) found in ${fmtPath(
          relPath
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
        .split('\n'),
      `More info: ${fmtPath(
        'https://github.com/cdcarson/frieda#modify-field-types-in-frieda-modelsts'
      )}`
    ]);
    return onUserCancelled();
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
