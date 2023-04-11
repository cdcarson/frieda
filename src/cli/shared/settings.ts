import path, { join, relative } from 'path';
import type { RcSettings, ResolvedSettings } from './types.js';
import { config, parse } from 'dotenv';

import {
  RC_FILE_NAME,
  CURRENT_MIGRATION_FILE_NAME,
  CURRENT_SCHEMA_FILE_NAME,
  FORMATTED_DB_URL_EXAMPLE,
  ENV_DB_URL_KEYS
} from './constants.js';
import fs from 'fs-extra';
import {
  isCancel,
  log,
  select,
  text,
  confirm,
  spinner,
  intro,
  outro,
  note,
  password
} from '@clack/prompts';
import { cancelAndExit, formatFilePath, splitString } from './utils.js';
import colors from 'picocolors';

export const getSettings = async (): Promise<ResolvedSettings> => {
  let rcSettings = await readRcSettings();
  const dbResult = await getDatabaseUrl(rcSettings);
  rcSettings = dbResult.rcSettings;
  const databaseUrl = dbResult.databaseUrl;
  const schemaResult = await getSchemaDirectoryFullPath(rcSettings);
  rcSettings = schemaResult.rcSettings;
  const schemaDirectoryFullPath = schemaResult.schemaDirectoryFullPath;
  const codeResult = await getGeneratedCodeDirectoryFullPath(rcSettings);
  rcSettings = codeResult.rcSettings;
  const generatedCodeDirectoryFullPath = codeResult.generatedCodeDirectoryFullPath;
  log.success([
    colors.bold('Database URL:'),
      maskDatabaseURLPassword(databaseUrl),
      colors.dim(
        `Source: ${colors.cyan(dbResult.sourceFile)} ${colors.magenta(dbResult.sourceKey)}`
      ),
    
    `${colors.bold('Schema directory:')} ${formatFilePath(schemaDirectoryFullPath)}`, 
    `${colors.bold('Generated code directory:')} ${formatFilePath(generatedCodeDirectoryFullPath)}`, 
  ].join('\n'))
  return {
    ...rcSettings,
    databaseUrl,
    generatedCodeDirectoryFullPath,
    schemaDirectoryFullPath,
    currentMigrationFullPath: join(schemaDirectoryFullPath, CURRENT_MIGRATION_FILE_NAME),
    currentSchemaFullPath: join(schemaDirectoryFullPath, CURRENT_SCHEMA_FILE_NAME)
  }
}

const readRcSettings = async (): Promise<Partial<RcSettings>> => {
  const s = spinner();
  const rcPath = getRcFilePath();
  s.start(`Reading ${formatFilePath(rcPath)}...`);
  const exists = await fs.exists(rcPath);
  let rawSettings: Partial<RcSettings> = {};
  if (exists) {
    try {
      rawSettings = await fs.readJSON(rcPath);
    } catch (error) {
      rawSettings = {};
    }
  }

  s.stop(`Reading ${formatFilePath(rcPath)}... done.`);
  return rawSettings;
};

const writeRcSettings = async (
  update: Partial<RcSettings>
): Promise<Partial<RcSettings>> => {
  const s = spinner();
  const rcPath = getRcFilePath();
  s.start(`Saving ${formatFilePath(rcPath)}...`);
  const exists = await fs.exists(rcPath);
  let rawSettings: Partial<RcSettings> = {};
  if (exists) {
    try {
      rawSettings = await fs.readJSON(rcPath);
    } catch (error) {
      rawSettings = {};
    }
  }
  rawSettings = { ...rawSettings, ...update };
  await fs.writeJSON(rcPath, rawSettings, { spaces: 1 });
  s.stop(`Saving ${formatFilePath(rcPath)}... done.`);
  return rawSettings;
};
const getRcFilePath = (): string => {
  return join(process.cwd(), RC_FILE_NAME);
};

export const isValidDatabaseURL = (url: unknown): boolean => {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

const maskDatabaseURLPassword = (urlStr: string): string => {
  const url = new URL(urlStr);

  const protocol = url.protocol;
  url.protocol = 'http:';
  const { username, hostname } = url;
  url.password = '<PASSWORD>';

  return (
    colors.cyan(protocol + '//' + username + ':') +
    colors.dim('<password>') +
    colors.cyan('@' + hostname)
  );
};

export const isValidFilePathInCwd = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const fp = stripTrailingSlash(join(process.cwd(), value.trim()));
  return fp.startsWith(process.cwd()) && fp !== process.cwd();
};

export const promptValidateFilePath = (value: unknown): string | undefined => {
  if (!isValidFilePathInCwd(value as string)) {
    return `Path must resolve to a directory in the current project root.`;
  }
};

export const stripTrailingSlash = (p: string): string => {
  return p.replace(/\/$/, '');
};




type GetGeneratedCodeDirectoryFullPathResult = {
  rcSettings: Partial<RcSettings>;
  generatedCodeDirectoryFullPath: string;
};

const getGeneratedCodeDirectoryFullPath = async (
  rcSettings: Partial<RcSettings>
): Promise<GetGeneratedCodeDirectoryFullPathResult> => {
  let { generatedCodeDirectory } = rcSettings;
  const origGeneratedCodeDirectory = generatedCodeDirectory;
  let error: Error | null = null;
  generatedCodeDirectory = generatedCodeDirectory ? generatedCodeDirectory.trim() : '';
  if (!origGeneratedCodeDirectory) {
    error = new Error(
      `Generated code directory (${colors.cyan(
        'generatedCodeDirectory'
      )}) not found in ${formatFilePath(getRcFilePath())}.`
    );
  } else if (!isValidFilePathInCwd(generatedCodeDirectory)) {
    error = new Error(
      `Invalid generated code directory (${colors.cyan(
        'generatedCodeDirectory'
      )}) in ${formatFilePath(
        getRcFilePath()
      )}. Path must resolve to a directory in the current project root.`
    );
  }
  if (error) {
    log.error(splitString(error.message).join('\n'));
    log.message(
      splitString(
        `
        Relative path to the folder where 
         model and other application code will be generated.
        `
      ).join('\n')
    );
    const value = await text({
      message: 'Generated code directory path:',
      placeholder: 'Relative path from the project root',
      initialValue: '',
      validate: promptValidateFilePath
    });
    if (isCancel(value)) {
      return cancelAndExit();
    }
    generatedCodeDirectory = value;
    rcSettings = await writeRcSettings({ generatedCodeDirectory });
  }
  const fullPath = join(process.cwd(), generatedCodeDirectory);
  return {rcSettings, generatedCodeDirectoryFullPath: fullPath};
};

type GetSchemaDirectoryResult = {
  rcSettings: Partial<RcSettings>;
  schemaDirectoryFullPath: string;
};
const getSchemaDirectoryFullPath = async (
  rcSettings: Partial<RcSettings>
): Promise<GetSchemaDirectoryResult> => {
  let { schemaDirectory } = rcSettings;
  const origSchemaDirectory = schemaDirectory;
  let error: Error | null = null;
  schemaDirectory = schemaDirectory ? schemaDirectory.trim() : '';
  if (!origSchemaDirectory) {
    error = new Error(
      `Schema directory (${colors.cyan(
        'schemaDirectory'
      )}) not found in ${formatFilePath(getRcFilePath())}.`
    );
  } else if (!isValidFilePathInCwd(schemaDirectory)) {
    error = new Error(
      `Invalid schema directory (${colors.cyan(
        'schemaDirectory'
      )}) in ${formatFilePath(
        getRcFilePath()
      )}. Path must resolve to a directory in the current project root.`
    );
  }
  if (error) {
    log.error(splitString(error.message).join('\n'));
    log.message(
      splitString(
        `
          The  schema directory contains the current schema, 
          the current migration, and the migration history.
        `
      ).join('\n')
    );
    const value = await text({
      message: 'Schema directory path:',
      placeholder: 'Relative path from the project root',
      initialValue: 'schema',
      validate: promptValidateFilePath
    });
    if (isCancel(value)) {
      return cancelAndExit();
    }
    schemaDirectory = value;
    rcSettings = await writeRcSettings({ schemaDirectory });
  }
  const fullPath = join(process.cwd(), schemaDirectory);
  return {rcSettings, schemaDirectoryFullPath: fullPath};
};


type GetDatabaseUrlResult = {
  rcSettings: Partial<RcSettings>;
  databaseUrl: string;
  sourceFile: string;
  sourceKey:string;
};
const getDatabaseUrl = async (
  rcSettings: Partial<RcSettings>
): Promise<GetDatabaseUrlResult> => {
  type Result = {
    envFileKey: string;
    databaseUrl: string;
  };
  const read = async (relPath: string): Promise<Result | Error> => {
    const path = join(process.cwd(), relPath);
    const exists = await fs.exists(path);
    if (!exists) {
      return new Error(
        `The environment file at ${formatFilePath(path)} does not exist.`
      );
    }
    const content = await fs.readFile(join(process.cwd(), relPath), 'utf-8');
    let env: Record<string, string> = {};
    try {
      env = parse(content);
    } catch (error) {
      return new Error(
        `The environment file at ${formatFilePath(
          path
        )} could not be parsed by dotenv.`
      );
    }
    const keys: string[] = ENV_DB_URL_KEYS.filter(
      (key) => typeof env[key] === 'string'
    );

    for (const key of keys) {
      if (isValidDatabaseURL(env[key])) {
        return {
          databaseUrl: env[key],
          envFileKey: key
        };
      }
    }
    return new Error(
      `Could not find a valid database URL as either ${ENV_DB_URL_KEYS.map(
        (k) => colors.magenta(k)
      ).join(' or ')} in ${formatFilePath(path)}.`
    );
  };
  let { envFile } = rcSettings;
  const origEnvFile = envFile;
  if (!envFile) {
    envFile = '.env';
  }
  let result = await read(envFile);
  while (result instanceof Error) {
    log.error(
      [
        `Database URL not found in ${formatFilePath(envFile)}`,
        ...splitString(result.message)
      ].join('\n')
    );
    const fix: string | Symbol = await select({
      message: 'Fix',
      options: [
        {
          label: `Add the database URL variable to ${formatFilePath(envFile)}`,
          value: envFile
        },
        {
          label: `Specify a different environment file`,
          value: 'different'
        },
        {
          label: 'Cancel',
          value: 'cancel'
        }
      ]
    });

    if (isCancel(fix) || fix === 'cancel') {
      return cancelAndExit();
    }
    if (fix !== envFile) {
      const newEnvFile = await text({
        message: 'Path to file',
        placeholder: 'Relative path from project root',
        validate: promptValidateFilePath
      });
      if (isCancel(newEnvFile)) {
        return cancelAndExit();
      }
      envFile = newEnvFile;
    }

    log.message(
      [
        `1. Create ${colors.cyan(envFile)} if it does not exist.`,
        `2. Make sure ${colors.cyan(envFile)} is .gitignore'd.`,
        `3. Add the database URL to ${colors.cyan(envFile)} as one of:`,
        ...ENV_DB_URL_KEYS.map((k) =>
          colors.gray(`   ${k}=${FORMATTED_DB_URL_EXAMPLE}`)
        )
      ].join('\n')
    );
    const done = await confirm({
      message: 'Confirm:',
      active: `I've done this`,
      inactive: 'Cancel'
    });
    if (isCancel(done) || !done) {
      return cancelAndExit();
    }

    result = await read(envFile);
  }
  if (origEnvFile !== envFile) {
    rcSettings = await writeRcSettings({
      envFile
    });
  }
  
  return { rcSettings, databaseUrl: result.databaseUrl, sourceFile: envFile, sourceKey: result.envFileKey };
};
