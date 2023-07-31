import yargs from 'yargs';
import type { FriedaCliArgs } from './types.js';
import { Options } from './options.js';
import kleur from 'kleur';
import { FRIEDA_VERSION } from '$lib/version.js';
import { getStdOutCols, log, squishWords } from './utils.js';
import { OPTION_DESCRIPTIONS } from './option-descriptions.js';
import { fetchSchema } from './fetch-schema.js';
import { generateCode } from './generate-code.js';
import { parseSchema } from './parse-schema.js';
import { relative } from 'node:path';
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
        OPTION_DESCRIPTIONS.envFile,
        getStdOutCols() - 30
      ),
      type: 'string'
    })
    .option('output-directory', {
      alias: 'o',
      description: squishWords(
        OPTION_DESCRIPTIONS.outputDirectory,
        getStdOutCols() - 30
      ),
      type: 'string'
    })
    .option('init', {
      alias: 'i',
      description: squishWords(OPTION_DESCRIPTIONS.init, getStdOutCols() - 30),
      type: 'boolean'
    })
    .option('help', {
      alias: 'h',
      description: squishWords(OPTION_DESCRIPTIONS.help, getStdOutCols() - 30),
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
  const fetchedSchema = await fetchSchema(options.connection);
  const schema = parseSchema(fetchedSchema);
  const files = await generateCode(options, schema);
  log.info(['Files:', ...files.map((f) => ` - ${relative(cwd, f)}`)]);
  console.log();
};
