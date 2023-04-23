import colors from 'picocolors';
import prettier from 'prettier';
import { cancel } from '@clack/prompts';
import fs from 'fs-extra';
import {
  createConnection,
  type Connection as Mysql2Connection
} from 'mysql2/promise';
import { connect, type Connection } from '@planetscale/database';
import stripAnsi from 'strip-ansi';
import { spinner } from '@clack/prompts';

export type WaitSpinner = { done: () => void; error: () => void };
export const wait = (msg: string, show = true): WaitSpinner => {
  if (!show) {
    return {
      done: () => {},
      error: () => {}
    };
  }
  const s = spinner();
  s.start(`${msg}...`);
  return {
    done: () => {
      s.stop(`${msg}... ${colors.green('done.')}`);
    },
    error: () => {
      s.stop(`${msg}... ${colors.red('error.')}`);
    }
  };

  // const s = ora({
  //   spinner: cliSpinners.arc
  // })
  // s.start(`${msg}...`);
  // return {
  //   done: () => {
  //     s.succeed(`${msg}... ${colors.green('done.')}`)
  //   },
  //   error: () => {
  //     s.fail(`${msg}... ${colors.red('error.')}`)
  //   }
  // };
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

export const fmtVarName = (name: string) => colors.magenta(name);
export const fmtValue = (s: string) => colors.blue(s);
export const fmtPath = (p: string) => colors.cyan(colors.underline(p));
export const fmtEx = (p: string) => colors.bold(p);

export const squishWords = (s: string, lineWidth = 50): string => {
  const paras = s
    .trim()
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((para) => {
      const lines: string[] = [''];
      const words = para.split(/\s+/);
      while (words.length > 0) {
        // if (stripAnsi(lines[lines.length - 1]).length > lineWidth) {
        //   lines.push('');
        // }
        const word = words.shift();
        lines[lines.length - 1] = lines[lines.length - 1] + ' ' + word;
        const nextWord = words[0] || '';
        if (
          stripAnsi(lines[lines.length - 1]).length +
            1 +
            stripAnsi(nextWord).length >
          lineWidth
        ) {
          lines.push('');
        }
      }
      return lines
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .join('\n');
    });
  return paras.join('\n\n');
};

export const isPlainObject = (obj: unknown) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

/** Regexes for parsing schema*/

/**
 * Extracts quoted substrings from a source string.
 * Note that the original quotes are included in the results.
 */
export const getStringLiterals = (source: string): string[] => {
  // see https://stackoverflow.com/questions/171480/regex-grabbing-values-between-quotation-marks/29452781#29452781
  const rx =
    /(?=["'])(?:"[^"\\]*(?:\\[\s\S][^"\\]*)*"|'[^'\\]*(?:\\[\s\S][^'\\]*)*')/g;
  const matches = source.matchAll(rx);
  return Array.from(matches).map((m) => m[0]);
};

/**
 * Given a string like "prefix(anything whatever)" returns 'anything whatever'
 */
export const getParenthesizedArgs = (
  source: string,
  prefix: string
): string => {
  const rx = new RegExp(`(\\s|^)${prefix}\\s*\\((.*)\\)(\\s|$)`, 'i');
  const match = source.match(rx);
  return match ? match[2] : '';
};

export const getMatchAmong = (
  source: string,
  choices: string[],
  ignoreCase = true
): string[] => {
  const rx = new RegExp(
    `\\b(${choices.join('|')})\\b`,
    ignoreCase ? 'gi' : 'g'
  );
  const matches = source.matchAll(rx);
  return Array.from(matches).map((m) => m[1]);
};
