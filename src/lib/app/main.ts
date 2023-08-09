import yargs from 'yargs';
import type { FriedaCliArgs } from './types.js';
import { Options } from './options.js';
import kleur from 'kleur';
import { FRIEDA_VERSION } from '$lib/version.js';
import { getStdOutCols, squishWords } from './utils.js';
import { readSchemaDefinitionFile } from './read-schema-definition-file.js';
import { fetchSchema } from './fetch-schema.js';
import { parseSchema } from './parse-schema.js';
import { generateCode } from './generate-code.js';
export const main = async (cwd: string, args: string[]) => {
  const app = yargs(args)
    .scriptName('frieda')
    .usage('frieda [options]')
    .version(false)
    .help(false)
    .wrap(null)
    .option('env-file', {
      alias: 'e',
      description: squishWords(
        Options.optionDescriptions.envFile,
        getStdOutCols() - 30
      ),
      type: 'string'
    })
    .option('output-directory', {
      alias: 'o',
      description: squishWords(
        Options.optionDescriptions.outputDirectory,
        getStdOutCols() - 30
      ),
      type: 'string'
    })
    .option('compile-js', {
      alias: 'j',
      description: squishWords(
        Options.optionDescriptions.compileJs,
        getStdOutCols() - 30
      ),
      type: 'boolean'
    })
    .option('init', {
      alias: 'i',
      description: squishWords(
        Options.optionDescriptions.init,
        getStdOutCols() - 30
      ),
      type: 'boolean'
    })
    .option('help', {
      alias: 'h',
      description: squishWords(
        Options.optionDescriptions.help,
        getStdOutCols() - 30
      ),
      type: 'boolean'
    });
  console.log(kleur.bold('frieda'), kleur.dim(`v${FRIEDA_VERSION}`), '🦮');
  console.log();
  const cliArgs: Partial<FriedaCliArgs> = app.parseSync();
  if (cliArgs.help) {
    app.showHelp();
    return;
  }
  const options = await Options.create(cwd, cliArgs);
  const start = Date.now();
  const schemaModels = await readSchemaDefinitionFile(options);
  const { fetchedSchema, tableCreateStatements } = await fetchSchema(
    options.connection
  );
  const parsedSchema = parseSchema(schemaModels, fetchedSchema);
  await generateCode(options, parsedSchema, tableCreateStatements);
  console.log(`Done in ${(Date.now() - start) / 1000} seconds.`, '🦮');
  console.log();
};
