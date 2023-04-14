import type { RcSettings, FullSettings } from './types.js';
import {
  cancelAndExit,
  fmtPath,
  fmtVarName,
  formatFilePath,
  getServerlessConnection,
  isValidDatabaseURL,
  isValidFilePathInCwd,
  maskDatabaseURLPassword,
  promptValidateFilePath,
  wait
} from './utils.js';
import fs from 'fs-extra';
import { join } from 'path';
import { FRIEDA_RC_FILE_NAME, ENV_DB_URL_KEYS } from './constants.js';
import { text, isCancel, log, select } from '@clack/prompts';
import colors from 'picocolors';
import { parse, type DotenvParseOutput } from 'dotenv';
type CurrentDatabaseUrlResult = {
  envFilePath: string;
  envKey?: string;
  databaseUrl?: string;
  error?: Error;
};

export const getSettings = async (): Promise<FullSettings> => {
  let s = wait('Reading current settings');
  const rcSettings = await readRc();
  s.done();
  const schemaDirectory = await getSchemaDirectory(rcSettings);
  const generatedCodeDirectory = await getGeneratedCodeDirectory(rcSettings);
  const databaseResult = await getDatabaseResult(rcSettings);
  const externalTypeImports = rcSettings.externalTypeImports || [];
  const typeBigIntAsString = rcSettings.typeBigIntAsString !== false;
  const typeTinyIntOneAsBoolean = rcSettings.typeTinyIntOneAsBoolean !== false;
  const changed =
    schemaDirectory !== rcSettings.schemaDirectory ||
    generatedCodeDirectory !== rcSettings.generatedCodeDirectory ||
    databaseResult.envFilePath !== rcSettings.envFilePath;
  if (changed) {
    await saveRc({
      schemaDirectory,
      generatedCodeDirectory,
      envFilePath: databaseResult.envFilePath
    });
  }
  const out: string[] = [
    `${colors.bold('Settings')}`,
    ` - settings file: ${formatFilePath(getRcFullPath())}`,
    ` - environment variables file: ${formatFilePath(
      join(process.cwd(), databaseResult.envFilePath)
    )}`,
    '',
    `Schema Directory (${colors.magenta('schemaDirectory')})`,
    formatFilePath(join(process.cwd(), schemaDirectory)),
    '',
    `Code Directory (${colors.magenta('generatedCodeDirectory')})`,
    formatFilePath(join(process.cwd(), generatedCodeDirectory)),
    '',
    `External Type Imports (${colors.magenta('externalTypeImports')})`,
    ...externalTypeImports.map((s) => colors.gray(`${s}`)),
    '',
    `Type ${colors.gray(`bigint`)} as ${colors.gray(
      `string`
    )}? (${colors.magenta('typeBigIntAsString')})`,
    typeBigIntAsString ? colors.green('yes') : colors.red('no'),
    '',
    `Type ${colors.gray(`tinyint(1)`)} columns as ${colors.gray(
      `boolean`
    )}? (${colors.magenta('typeTinyIntOneAsBoolean')})`,
    typeTinyIntOneAsBoolean ? colors.green('yes') : colors.red('no'),
    '',
    `Database URL (${colors.magenta(databaseResult.envKey)} in ${formatFilePath(
      join(process.cwd(), databaseResult.envFilePath)
    )})`,
    maskDatabaseURLPassword(databaseResult.databaseUrl as string)
  ];
  log.success(out.join('\n'));
  return {
    schemaDirectory,
    generatedCodeDirectory,
    externalTypeImports,
    databaseUrl: databaseResult.databaseUrl as string,
    envFilePath: databaseResult.envFilePath,
    typeBigIntAsString,
    typeTinyIntOneAsBoolean
  };
};

export const updateSettings = async (settings: FullSettings) => {};

// const promptEnvFilePath = async (
//   currentValue: string | null
// ): Promise<string> => {

//   const prompt = async (p: string|null, error: string|null) => {
//     const value = await text({
//       message: 'Enter the path to an environment variables file:',
//       placeholder: 'Relative path from the project root',
//       initialValue: typeof currentValue === 'string' ? currentValue : '',
//       validate: (val) => {

//       }
//     });
//     if (isCancel(value)) {
//       return cancelAndExit();
//     }
//     return value;
//   }

//   const valid = currentValue && isValidFilePathInCwd(currentValue);
//   const fileExists = valid ? await fs.exists(join(process.cwd(), currentValue)) : false;
//   const header = `${colors.bold(
//     valid ? 'Update' : colors.red(currentValue ? 'Invalid' : 'Missing')
//   )} ${colors.bold('environment variables file path')} (${fmtVarName(
//     'envFilePath'
//   )})`;
//   const message = [
//     header,
//     `The environment variables file path should point to a file containing`,
//     `the database URL as either ${ENV_DB_URL_KEYS.map(k => fmtVarName(k)).join(' or ')}.`,
//     `${colors.bold('Important:')} This file should always be added to ${fmtPath('.gitignore')}, since`,
//     `the URL contains the database password. If you are currently using separate`,
//     `${colors.gray('host')}, ${colors.gray('user')} and ${colors.gray('password')} variables, the URL format is`,

//     ''
//   ];
//   if (currentValue) {
//     const doesNotExist = valid && !fileExists ? colors.red(' (File does not exist)') : ''
//     message.push(`${colors.dim('Currently:')} ${fmtPath(currentValue)}${doesNotExist}`, '');
//   }
//   if (valid) {
//     log.info(message.join('\n'));
//   } else {
//     log.error(message.join('\n'));
//   }
//   const value = await text({
//     message: 'Enter generated code directory:',
//     placeholder: 'Relative path from the project root',
//     initialValue: typeof currentValue === 'string' ? currentValue : '',
//     validate: promptValidateFilePath
//   });
//   if (isCancel(value)) {
//     return cancelAndExit();
//   }
//   return value;
// };

const promptGeneratedCodeDirectory = async (
  currentValue: string | null
): Promise<string> => {
  const valid = currentValue && isValidFilePathInCwd(currentValue);
  let header = colors.bold(
    `${
      valid ? 'Update' : currentValue ? 'Invalid' : 'Missing'
    } generated code directory`
  );
  if (!valid) {
    header = colors.red(header);
  }
  const varName = fmtVarName('generatedCodeDirectory');

  const message = [
    `${header} (${varName})`,
    '',
    `The generated code directory is where we place generated typescript code.`,
    `This should be in your source directory. It's a good idea to specify a`,
    `a dedicated directory, without any of your own code, for example,`,
    `${fmtPath('src/database/_generated')}.`,
    ''
  ];
  if (currentValue) {
    message.push(`${colors.dim('Currently:')} ${fmtPath(currentValue)}`, '');
  }
  if (valid) {
    log.info(message.join('\n'));
  } else {
    log.error(message.join('\n'));
  }
  const value = await text({
    message: 'Enter generated code directory:',
    placeholder: 'Relative path from the project root',
    initialValue: typeof currentValue === 'string' ? currentValue : '',
    validate: promptValidateFilePath
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  return value;
};

const promptSchemaDirectory = async (
  currentValue: string | null
): Promise<string> => {
  const valid = currentValue && isValidFilePathInCwd(currentValue);
  let header = colors.bold(
    `${
      valid ? 'Update' : currentValue ? 'Invalid' : 'Missing'
    } schema directory`
  );
  if (!valid) {
    header = colors.red(header);
  }
  const varName = fmtVarName('schemaDirectory');
  const message = [
    `${header} (${varName})`,
    '',
    `The schema directory is where we keep the current schema, the current.`,
    `migration and the migration history. This should be a dedicated directory`,
    `at the root of your project, for example, ${fmtPath('src/schema')}.`,
    ''
  ];
  if (currentValue) {
    message.push(`${colors.dim('Currently:')} ${fmtPath(currentValue)}`, '');
  }
  if (valid) {
    log.info(message.join('\n'));
  } else {
    log.error(message.join('\n'));
  }
  const value = await text({
    message: 'Enter schema directory:',
    placeholder: 'Relative path from the project root',
    initialValue: typeof currentValue === 'string' ? currentValue : '',
    validate: promptValidateFilePath
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  return value;
};

const getGeneratedCodeDirectory = async (
  settings: Partial<RcSettings>
): Promise<string> => {
  if (
    typeof settings.generatedCodeDirectory === 'string' &&
    isValidFilePathInCwd(settings.generatedCodeDirectory)
  ) {
    return settings.generatedCodeDirectory;
  }
  return await promptGeneratedCodeDirectory(
    settings.generatedCodeDirectory || null
  );
};

const getSchemaDirectory = async (
  settings: Partial<RcSettings>
): Promise<string> => {
  if (
    typeof settings.schemaDirectory === 'string' &&
    isValidFilePathInCwd(settings.schemaDirectory)
  ) {
    return settings.schemaDirectory;
  }
  return await promptSchemaDirectory(settings.schemaDirectory || null);
};

const getDatabaseResult = async (
  settings: Partial<RcSettings>
): Promise<CurrentDatabaseUrlResult> => {
  const getCurrentDatabaseUrl = async (
    envFile: string | undefined
  ): Promise<CurrentDatabaseUrlResult> => {
    const envFilePath = envFile || '.env';
    const envFileFullPath = join(process.cwd(), envFilePath);
    const envFileExists = await fs.exists(envFileFullPath);
    if (!envFileExists) {
      return {
        envFilePath,
        error: new Error(
          `The file at ${formatFilePath(envFileFullPath)} does not exist.`
        )
      };
    }
    const fileContents = await fs.readFile(envFileFullPath, 'utf-8');
    const env: DotenvParseOutput = parse(fileContents);
    const envKeys = Object.keys(env);
    const candidateKeys = ENV_DB_URL_KEYS.filter((k) => envKeys.includes(k));
    if (candidateKeys.length === 0) {
      return {
        envFilePath,
        error: new Error(
          [
            `The file at ${fmtPath(
              envFilePath
            )} doesn't have a database URL variable.`
          ].join('\n')
        )
      };
    }
    const results: { key: string; url: string; error: string | null }[] = [];
    for (const key of candidateKeys) {
      const url = env[key] || '';
      if (!isValidDatabaseURL(url)) {
        results.push({
          key,
          url,
          error: `${colors.magenta(key)} is not a valid database URL.`
        });
      }
      try {
        const conn = getServerlessConnection(url);
        await conn.execute('SELECT 1 as `foo`');
        results.push({
          key,
          url,
          error: null
        });
      } catch (error) {
        results.push({
          key,
          url,
          error: [
            `Could not connect with ${colors.magenta(key)} in ${fmtPath(envFilePath)}.`,
            `${colors.dim('The server said:')} ${colors.italic(
              error instanceof Error ? error.message : ''
            )}`
          ].join('\n')
        });
      }
    }
    const valid = results.filter((r) => r.error === null);
    if (valid.length > 0) {
      return {
        envFilePath,
        databaseUrl: valid[0].url,
        envKey: valid[0].key
      };
    }
    return {
      envFilePath,
      error: new Error(
        [
          ...results.map((r) => r.error)
        ].join('\n')
      )
    };
  };

  const promptEnvFilePath = async (
    envFilePath: string,
    error: Error
  ): Promise<string> => {
    log.error(
      [
        colors.bold(colors.red('Missing or invalid database URL')),
        '',
        colors.red('Error:'),
        error.message,
        '',
        `Make sure the environment file at ${fmtPath(
          envFilePath
        )} exists and contains`,
        `a variable named ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(
          ' or '
        )}`,
        `with a database URL in the format: ${colors.gray(
          `mysql://${colors.magenta('user')}:${colors.magenta(
            'password'
          )}@${colors.magenta('host')}`
        )}.`,
        '',
        'Alternately, you can specify a different environment file.'
      ].join('\n')
    );

    const fix = await select({
      message: `Specify a different environment file?`,
      initialValue: 'tryAgain',
      options: [
        {
          label: `Yes`,
          value: 'enterPath'
        },
        {
          label: `No, try again with ${fmtPath(envFilePath)}`,
          value: 'tryAgain'
        }
      ]
    });
    if (isCancel(fix)) {
      return cancelAndExit();
    }
    if ('enterPath' === fix) {
      const p = await text({
        message: 'Enter file path:',
        placeholder: 'Relative path from the project root',
        validate: promptValidateFilePath
      });
      if (isCancel(p)) {
        return cancelAndExit();
      }
      return p;
    }
    return envFilePath;
  };

  let envFilePath = settings.envFilePath || '.env';
  let s = wait('Checking database URL');
  let databaseUrlResult = await getCurrentDatabaseUrl(envFilePath);
  if (databaseUrlResult.error instanceof Error) {
    s.error();
  } else {
    s.done();
  }
  while (databaseUrlResult.error instanceof Error) {
    envFilePath = await promptEnvFilePath(
      databaseUrlResult.envFilePath,
      databaseUrlResult.error
    );
    s = wait('Checking database URL');
    databaseUrlResult = await getCurrentDatabaseUrl(envFilePath);
    if (databaseUrlResult.error instanceof Error) {
      s.error();
    } else {
      s.done();
    }
  }
  return databaseUrlResult;
};

const getRcFullPath = () => {
  return join(process.cwd(), FRIEDA_RC_FILE_NAME);
};
const saveRc = async (newSettings: Partial<RcSettings>): Promise<void> => {
  const p = getRcFullPath();
  const s = wait(`Saving ${formatFilePath(p)}`);
  const oldSettings = await readRc();

  await fs.writeJSON(
    p,
    {
      ...oldSettings,
      ...newSettings
    },
    { spaces: 1 }
  );
  s.done();
};

const readRc = async (): Promise<Partial<RcSettings>> => {
  const p = getRcFullPath();
  const rcFileExists = await fs.exists(p);
  if (!rcFileExists) {
    return {};
  }
  return await fs.readJSON(p);
};
