import colors from 'picocolors';
import prettier from 'prettier';
import { relative } from 'path';
import { cancel, spinner } from '@clack/prompts';
import fs from 'fs-extra';
import { join } from 'path';
import {
  createConnection,
  type Connection as Mysql2Connection
} from 'mysql2/promise';
import { connect, type Connection } from '@planetscale/database';
export const formatFilePath = (p: string): string => {
  return colors.underline(colors.cyan(relative(process.cwd(), p)));
};

export const wait = (msg: string): {done: () => void, error: ()=> void} => {
  const s = spinner();
  s.start(`${msg}...`)
  return {
    done: () => {
      s.stop(`${msg}...${colors.green('done')}`)
    },
    error: () => {
      s.stop(`${msg}...${colors.red('error')}`)
    }
  }
}

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

export const isValidDatabaseURL = (urlStr: unknown): boolean => {
  if (typeof urlStr !== 'string') {
    return false;
  }
  try {
    const url = new URL(urlStr);
    // won't work without this
    url.protocol = 'http:';
    const { username, hostname, password } = url;
    if (username.length === 0) {
      return false;
    }
    if (password.length === 0) {
      return false;
    }
    if (hostname.length === 0) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

export const maskDatabaseURLPassword = (urlStr: string): string => {
  const url = new URL(urlStr);

  const protocol = url.protocol;
  url.protocol = 'http:';
  const { username, hostname } = url;
  url.password = '<PASSWORD>';
  return colors.cyan(`${protocol}//${username}:${colors.gray('<PASSWORD>')}@${hostname}`)
};
export const fmtVarName = (name: string) => colors.magenta(name);
export const fmtPath = (p: string) => colors.cyan(colors.underline(p))
