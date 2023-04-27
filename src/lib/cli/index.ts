import colors from 'picocolors';
import { FRIEDA_VERSION } from '../version.js';
import parser from 'yargs-parser';
import { hideBin } from 'yargs/helpers';
import { initCmd } from './cmd-init.js';
import { cmdMigrate } from './cmd-migrate.js';
import { generateCmd } from './cmd-generate.js';
import { cancel, log, intro, outro } from '@clack/prompts';
import {  fmtPath, squishWords } from './utils.js';
import { CURRENT_MIGRATION_SQL_FILE_NAME, FRIEDA_RC_FILE_NAME, MIGRATIONS_DIRECTORY_NAME } from './constants.js';
import { CliError } from './errors.js';
import { cmdModifyField } from './cmd-modify-field.js';
import { cmdAddField } from './cmd-add-field.js';
import { cmdDropField } from './cmd-drop-field.js';
type Command = {
  name: string;
  usage: string;
  alias: string;
  shortDesc: string;
  longDesc: string;
  options: {
    name: string;
    alias: string;
    desc: string;
  }[];
  cmd: (args: string[]) => Promise<void>
};
export const main = async () => {
  const commands: Command[] = [
    {
      name: 'generate',
      alias: 'g',
      usage: 'frieda generate',
      shortDesc: 'Generate code.',
      longDesc: `
      Fetches the schema from the database and creates model code.
      `,
      options: [],
      cmd: generateCmd
    },
    {
      name: 'add-field',
      alias: 'af',
      usage: 'frieda add-field [options]',
      shortDesc: 'Add a field.',
      longDesc: `
        Create and run sql to add a field to a model.
      `,
      options: [
        {
          name: 'model',
          alias: 'm',
          desc: `
          Optional. The (partial) name of the model (or underlying table) to which the field should be added.
          If more than one model matches, or none match, you will be prompted to choose 
          which model you mean.
          `
        },
       
      ],
      cmd: cmdAddField
    },
    {
      name: 'modify-field',
      alias: 'mf',
      usage: 'frieda modify-field [options]',
      shortDesc: `Modify a field's column definition.`,
      longDesc: `
        Create and run sql to update a field.
      `,
      options: [
        {
          name: 'model',
          alias: 'm',
          desc: `
          Optional. The (partial) name of the model (or underlying table) to which the field you wish to modify belongs.
          If more than one model matches, or none match, you will be prompted to choose 
          which model you mean.
          `
        },
        {
          name: 'field',
          alias: 'f',
          desc: `
          Optional. The (partial) name of the field (or underlying column) you wish to annotate.
          If more than one field matches, or none match, you will be prompted to choose 
          which field you mean.
          `
        }
      ],
      cmd: cmdModifyField
    },
    {
      name: 'drop-field',
      alias: 'df',
      usage: 'frieda drop-field [options]',
      shortDesc: 'Drop a field.',
      longDesc: `
      Create and run sql to drop a field from a model.
      `,
      options: [
        {
          name: 'model',
          alias: 'm',
          desc: `
          Optional. The (partial) name of the model (or underlying table) to which the field you wish to dro belongs.
          If more than one model matches, or none match, you will be prompted to choose 
          which model you mean.
          `
        },
        {
          name: 'field',
          alias: 'f',
          desc: `
          Optional. The (partial) name of the field (or underlying column) you wish to drop.
          If more than one field matches, or none match, you will be prompted to choose 
          which field you mean.
          `
        }
      ],
      cmd: cmdDropField
    },
    {
      name: 'migrate',
      alias: 'm',
      shortDesc: 'Run the current migration.',
      longDesc: `
      After confirmation, runs the SQL in ${colors.dim('<schemaDirectory>/')}${colors.cyan(CURRENT_MIGRATION_SQL_FILE_NAME)}.
      If the migration is successful, the old schema, the migration itself and the new schema are saved to
      a new ${colors.dim('<schemaDirectory>/')}${colors.cyan(MIGRATIONS_DIRECTORY_NAME)}${colors.dim('/<iso-date-string>')} folder,
       and code is regenerated 
      from the new schema. The contents of ${colors.cyan(CURRENT_MIGRATION_SQL_FILE_NAME)} will be cleared.

      If the migration fails, you will be prompted to try again (reloading whatever changes you have made
        to ${colors.cyan(CURRENT_MIGRATION_SQL_FILE_NAME)})
      or just bail.
      `,
      options: [],
      usage: 'frieda migrate',
      cmd: cmdMigrate
    },
    {
      name: 'init',
      alias: 'i',
      shortDesc: '(Re)initialize settings.',
      longDesc: `
      Initialize or update settings in ${fmtPath(FRIEDA_RC_FILE_NAME)}.
      `,
      options: [],
      usage: 'frieda init',
      cmd: initCmd
    }
  ];
  const args = parser(process.argv.slice(2), {
    alias: { help: ['h'] }
  });
  const command = commands.find(
    (c) => c.name === args._[0] || c.alias === args._[0]
  );
  console.log(
    `${colors.bold('Frieda')} 🦮 ${colors.dim(`v${FRIEDA_VERSION}`)}\n`
  );

  if (args.help || !command) {
    const introOutro = `help${command ? `:${command.name}` : ''}`
    intro(introOutro);
    if (!command) {
      const maxCommand = Math.max(...commands.map((c) => c.name.length));
      log.message([colors.dim('Usage:'), `${colors.bold('frieda')} <command> [options]`].join('\n'));
      log.message(
        [
          `${colors.dim('Commands:')}`,
          ...commands.map(
            (c) =>
              `frieda ${colors.bold(c.name)}${' '.repeat(
                maxCommand - c.name.length
              )}  ${c.shortDesc}`
          )
        ].join('\n')
      );
      log.message(
        [`${colors.dim('Options:')}`, colors.bold('-h, --help'), `Show this help.`].join('\n')
      );
    } else {
      log.message([
        colors.dim('Usage:'),
        `frieda ${colors.bold(command.name)} [options]`,
        `frieda ${colors.bold(command.alias)} [options]`
      ].join('\n'));
      
      log.message(
        [colors.dim('Description:'), squishWords(command.longDesc)].join('\n')
      );
      log.message(
        [
          `${colors.dim('Options:')}`,
          ...command.options.flatMap((option) => {
            return [
              colors.bold(`-${option.alias}, --${option.name}`),
              squishWords(option.desc),
              ' '
            ];
          }),
          `${colors.bold(`-h, --help`)}\nShow this help.`
        ].join('\n')
      );
      
    }

    outro( `${introOutro}:done 🦮`);
  } else {
    try {
      intro(command?.name);
      await command.cmd(process.argv.slice(3))
      outro(`${command?.name}:done 🦮`);
    } catch (error) {
      if (error instanceof CliError) {
        log.message();
        cancel(error.message)
        console.log()
        process.exit(0)
      }
      throw error;
    }
  }
};


