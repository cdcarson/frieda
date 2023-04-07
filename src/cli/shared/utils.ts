import colors from 'picocolors';
import prettier from 'prettier';
import { join, relative } from 'path';
import { cancel } from '@clack/prompts';
import fs from 'fs-extra';
import {
  createConnection,
  type Connection as Mysql2Connection
} from 'mysql2/promise';
import { connect, type Connection } from '@planetscale/database';
export const formatFilePath = (p: string): string => {
  return colors.underline(colors.cyan(relative(process.cwd(), p)));
};

export const prettify = async (
  contents: string,
  filePath: string
): Promise<string> => {
  const config = await prettier.resolveConfig(filePath);
  return prettier.format(contents, {
    ...config,
    filepath: filePath
  });
};

export const cancelAndExit = () => {
  cancel('Operation cancelled.');
  process.exit(0);
};

export const getMysql2Connection = async (
  databaseUrl: string
): Promise<Mysql2Connection> => {
  let ca: Buffer | null = null;
  try {
    ca = await fs.readFile('/etc/ssl/cert.pem');
  } catch (error) {
    throw Error('Could not read /etc/ssl/cert.pem');
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
    throw Error('Could not connect to the database.');
  }
};

export const getServerlessConnection = (databaseUrl: string): Connection => {
  return connect({
    url: databaseUrl
  });
};

export const splitString = (s: string, lineLength = 75): string[] => {
  const lines: string[] = [''];
  const words = s
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  while (words.length > 0) {
    const word = words.shift() as string;
    const rx = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
    const wordLength = word.replaceAll(rx, '').length;

    if (lines[lines.length - 1].length + wordLength > lineLength) {
      lines.push('');
    }
    lines[lines.length - 1] += `${word} `;
  }
  
  return lines;
};
