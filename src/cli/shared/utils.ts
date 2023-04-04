import colors from 'picocolors';
import prettier from 'prettier';
import { join, relative } from 'path';
import { cancel, confirm, isCancel, log, spinner, text } from '@clack/prompts';
import type { FriedaRcVars } from './types';
import fs from 'fs-extra'
import { createConnection, type Connection as Mysql2Connection } from 'mysql2/promise';
import { connect, type Connection } from '@planetscale/database';
export const formatFilePath = (p: string): string => {
  return colors.underline(colors.cyan(relative(process.cwd(), p)));
};



export const getGeneratedModelsDirectoryFullPath = (generatedModelsDirectory: string) => {
  return join(process.cwd(), generatedModelsDirectory);
};


export const getMigrationsDirectoryFullPath = (migrationsDirectory: string) => {
  return join(process.cwd(), migrationsDirectory);
};



export const getCurrentMigrationsFilePath = (migrationsDirectory: string) => {
  return join(
    getMigrationsDirectoryFullPath(migrationsDirectory),
    'current-migration.sql'
  );
};

export const getCurrentSchemaFilePath = (migrationsDirectory: string) => {
  return join(
    getMigrationsDirectoryFullPath(migrationsDirectory),
    'current-schema.sql'
  );
};





export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const replaceDatabaseURLPassword = (urlStr: string): string => {
  const url = new URL(urlStr);
  const savedProtocol = url.protocol;
  url.protocol = 'http:';
  url.password = '<PASSWORD>';
  url.protocol = savedProtocol;
  return url.href.replace('%3CPASSWORD%3E', '<PASSWORD>');
};


export const prettify = async (contents: string, filePath: string): Promise<string> => {
  const config = await prettier.resolveConfig(filePath);
  return prettier.format(contents, {
    ...config,
    filepath: filePath
  })
}

export const cancelAndExit = () => {
  cancel('Operation cancelled.');
  process.exit(0);
};













export const getMysql2Connection = async(databaseUrl: string): Promise<Mysql2Connection> => {
  let ca: Buffer|null = null;
  try {
    ca = await fs.readFile('/etc/ssl/cert.pem')
  } catch (error) {
    throw Error('Could not read /etc/ssl/cert.pem')
  }
  try {
    const connection = await createConnection({
      uri: databaseUrl,
      multipleStatements: true,
      ssl: {
        ca
      }
    });
    return connection;
  } catch (error) {
    throw Error('Could not connect to the database.')
  }
}

export const getServerlessConnection = (databaseUrl: string): Connection => {
  return connect({
    url: databaseUrl
  });
};

