import kleur from 'kleur';
import stripAnsi from 'strip-ansi';
import prompts from 'prompts';
import ora from 'ora';
import prettier from 'prettier';
import { DEFAULT_PRETTIER_OPTIONS } from './constants.js';

export const isPlainObject = (obj: unknown) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

export const getStdOutCols = (): number => {
  return process.stdout.columns && typeof process.stdout.columns === 'number'
    ? process.stdout.columns
    : 0;
};

export const squishWords = (s: string, lineWidth?: number): string => {
  const stdOutCols = getStdOutCols();
  const cols =
    lineWidth && lineWidth >= 40
      ? lineWidth
      : stdOutCols > 40
      ? stdOutCols - 4
      : 40;
  const paras = s
    .trim()
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((para) => {
      const lines: string[] = [''];
      const words = para.split(/\s+/);
      while (words.length > 0) {
        const word = words.shift();
        lines[lines.length - 1] = lines[lines.length - 1] + ' ' + word;
        const nextWord = words[0] || '';
        if (
          stripAnsi(lines[lines.length - 1]).length +
            1 +
            stripAnsi(nextWord).length >
          cols
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

export const fmtPath = (s: string) => kleur.underline(kleur.cyan(s));
export const fmtVal = (s: string) => kleur.blue(s);
export const fmtVarName = (s: string) => kleur.magenta(s);

export const prompt = async <
  T extends string | boolean | Record<string, unknown>
>(
  p: prompts.PromptObject
): Promise<T> => {
  const v = await prompts.prompt(p, { onCancel: onUserCancelled });
  return v[p.name as string];
};

export const onUserCancelled = (): never => {
  log.warn('Operation cancelled');
  process.exit(0);
};

const message = (message: string | string[], indent = 0) => {
  console.log(fromStringOrArray(message, indent));
};

export const log = {
  warn: (message: string | string[]) => {
    ora(fromStringOrArray(message)).warn();
  },
  error: (message: string | string[]) => {
    ora(fromStringOrArray(message)).fail();
  },
  info: (message: string | string[]) => {
    ora(fromStringOrArray(message)).info();
  },
  message,
  header: (title: string) => {
    const width = getStdOutCols();
    const before = Math.floor((width - (title.length + 2)) / 2);
    console.log(
      kleur.dim(`${'-'.repeat(before)} ${title} ${'-'.repeat(before)}`)
    );
  },
  table: (data: string[][], header?: string[]) => {
    const numCols = Math.max(
      ...data.map((arr) => arr.length, header ? header.length : 0)
    );
    const colWidths: number[] = [];
    for (let i = 0; i < numCols; i++) {
      let max = header ? (header[i] || '').length : 0;
      for (let j = 0; j < data.length; j++) {
        const str: string = data[j][i] || '';
        if (max < stripAnsi(str).length) {
          max = stripAnsi(str).length;
        }
      }
      colWidths.push(max + 4);
    }

    if (header) {
      let headerStr = '  ';
      for (let i = 0; i < numCols; i++) {
        const str = header[i] || '';
        headerStr += kleur.underline(str);

        if (i < numCols - 1) {
          headerStr += spaces(colWidths[i] - str.length);
        }
      }
      message(headerStr);
    }

    for (let i = 0; i < data.length; i++) {
      let rowStr = '  ';
      const row = data[i];
      for (let j = 0; j < numCols; j++) {
        const str = row[j] || '';
        rowStr += str;
        if (j < numCols - 1) {
          rowStr += spaces(colWidths[j] - stripAnsi(str).length);
        }
      }
      message(rowStr);
    }
  }
};

export const spaces = (length: number) => ' '.repeat(length);

const fromStringOrArray = (message: string | string[], indent = 2): string => {
  return (Array.isArray(message) ? message : [message])
    .map((s, i) => (i === 0 ? s : `${' '.repeat(indent)}${s}`))
    .join('\n');
};

export const maskDatabaseURLPassword = (urlStr: string): string => {
  const url = new URL(urlStr);

  const protocol = url.protocol;
  url.protocol = 'http:';
  const { username, hostname } = url;
  url.password = '<PASSWORD>';
  return kleur.cyan(
    `${protocol}//${username}:${kleur.gray('<PASSWORD>')}@${hostname}`
  );
};

export const promptValidateString = (value: unknown): string | true => {
  const p = typeof value === 'string' ? value.trim() : '';
  if (p.length === 0) {
    return 'Required.';
  }
  return true;
};

export const getParenthesizedArgs = (
  source: string,
  prefix: string
): string => {
  const rx = new RegExp(`(\\s|^)${prefix}\\s*\\((.*)\\)(\\s|$)`, 'i');
  const match = source.match(rx);
  return match ? match[2] : '';
};

export const blockComment = (lines: string[]): string => {
  return ['/**', ...lines.map((l) => ` * ${l}`), ' */'].join('\n');
};

export const getPrettierOptions = async (
  cwd: string
): Promise<prettier.Options> => {
  return (await prettier.resolveConfig(cwd)) || DEFAULT_PRETTIER_OPTIONS;
};

export const getFileLink = (relPath: string, line: number, col = 1): string => {
  return `${relPath}:${line}:${col}`;
};

/**
 * Adds an underscore to names not beginning with an alphabetical character,
 * thereby making a valid javascript identifier.
 */
export const getValidJavascriptIdentifier = (name: string): string => {
  return /^[a-z]/i.test(name) ? name : `_${name}`;
};
