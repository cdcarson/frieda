import { FRIEDA_VERSION } from '$lib/version.js';
import kleur from 'kleur';

import { getOptions } from './get-options.js';
import yargs from 'yargs';
import { cliFetchSchema } from './cli-fetch-schema.js';
import { cliGenerateCode } from './cli-generate-code.js';
import { getStdOutCols, squishWords } from './ui/formatters.js';
import { OPTION_DESCRIPTIONS } from './constants.js';
import { explore } from './explore.js';

export const main = async (argv: string[]) => {
 

  const helpWidth = getStdOutCols() - 30;
  const app = yargs(argv)
    .scriptName('frieda')
    .wrap(null)
    .version(false)
    .help(false)
    .usage('$0 [options]', 'Generate code.')
    .options({
      'explore': {
        alias: 'x',
        type: 'boolean',
        description: 'Explore/modify schema before generating code.'
      },
      'model': {
        alias: 'm',
        type: 'string',
        description: 'The model to explore.'
      },
      'field': {
        alias: 'f',
        type: 'string',
        description: 'The field to explore.'
      },
      'env-file': {
        alias: 'e',
        type: 'string',
        description: squishWords(OPTION_DESCRIPTIONS.envFile, helpWidth)
      },
      'output-directory': {
        alias: 'o',
        type: 'string',
        description: squishWords(OPTION_DESCRIPTIONS.outputDirectory, helpWidth)
      },
      'schema-directory': {
        alias: 's',
        type: 'string',
        description: squishWords(OPTION_DESCRIPTIONS.schemaDirectory, helpWidth)
      },
      'compile-js': {
        alias: 'j',
        type: 'boolean',
        description: squishWords(OPTION_DESCRIPTIONS.compileJs, helpWidth)
      },
      init: {
        alias: 'i',
        type: 'boolean',
        description: squishWords(
          '(Re)initialize options in .friedarc.json.',
          helpWidth
        )
      },
      help: {
        alias: 'h',
        type: 'boolean',
        description: 'Show help.'
      }
    })
    .group(
      [
        'explore',
        'model',
        'field'
      ],
      'Schema Options:'
    )
    .group(
      [
        'env-file',
        'output-directory',
        'schema-directory',
        'compile-js',
      ],
      'Code Generation Options:'
    )
    .group(
      [
        'init',
        'help'
      ],
      'Options:'
    );
  const parsed = await app.parse();
  console.log(kleur.bold('frieda'), kleur.dim(`v${FRIEDA_VERSION}`), '🦮');
  console.log();
  if (parsed.help) {
    app.showHelp();
  } else {
    const optionsResult = await getOptions(parsed, parsed.init === true);
    const { options, connection } = optionsResult;
    let schema = await cliFetchSchema(connection);
    const {files, types} = await cliGenerateCode(schema, options);
    if (parsed.explore || typeof parsed.model === 'string' || typeof parsed.field === 'string') {
      console.log(parsed.model)
      schema = await explore(schema, optionsResult, types, parsed.model, parsed.field);
    }
    
    
    console.log(kleur.bold('Done'), '🦮');
  }
  console.log();
 
};
