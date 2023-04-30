import colors from 'picocolors';
import prettier from 'prettier';
import { cancel } from '@clack/prompts';
import fs from 'fs-extra';

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

 
};

export const onPromptCancel = () => {
  console.log();
  console.log('Process cancelled');
  process.exit(0);
};








export const fmtVarName = (name: string) => colors.magenta(name);
export const fmtValue = (s: string) => colors.blue(s);
export const fmtPath = (p: string) => colors.cyan(colors.underline(p));
export const fmtErr = (p: string) => colors.italic(colors.red(p))
export const fmtEx = (p: string) => colors.bold(p);

export const getStdOutCols = (): number => {
  return process.stdout.columns && typeof process.stdout.columns === 'number' ? process.stdout.columns : 0;
}
export const squishWords = (s: string, lineWidth?: number): string => {
  const stdOutCols = getStdOutCols();
  const cols = lineWidth && lineWidth > 40 ? lineWidth : stdOutCols > 40 ? stdOutCols - 4 : 40;
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

export const isPlainObject = (obj: unknown) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

