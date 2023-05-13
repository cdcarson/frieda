import ora from 'ora';
import { getStdOutCols, spaces } from './formatters.js';
import colors from 'kleur';
import stripAnsi from 'strip-ansi';

const fromStringOrArray = (message: string | string[], indent = 2): string => {
  return (Array.isArray(message) ? message : [message])
    .map((s, i) => (i === 0 ? s : `${' '.repeat(indent)}${s}`))
    .join('\n');
};
const empty = () => console.log();
const warn = (message: string | string[]) => {
  ora(fromStringOrArray(message)).warn();
};

const error = (message: string | string[]) => {
  ora(fromStringOrArray(message)).fail();
};
const info = (message: string | string[]) => {
  ora(fromStringOrArray(message)).info();
};

const header = (title: string) => {
  const width = getStdOutCols();
  const before = Math.floor((width - (title.length + 2)) / 2);
  console.log(
    colors.dim(`${'-'.repeat(before)} ${title} ${'-'.repeat(before)}`)
  );
};
const footer = () => {
  console.log(colors.dim('-'.repeat(getStdOutCols())));
};
const message = (message: string | string[]) => {
  console.log(fromStringOrArray(message, 0));
};

const table = (data: string[][], header?: string[] ) => {
  const numCols = Math.max(...data.map(arr => arr.length, header ? header.length : 0));
  const colWidths: number[] = [];
  for(let i = 0; i < numCols; i++) {
    let max = header ? ( header[i] || '').length : 0;
    for(let j = 0; j < data.length; j++) {
      const str: string = data[j][i] || '';
      if (max < stripAnsi(str).length) {
        max = stripAnsi(str).length
      }
    }
    colWidths.push(max + 4)
  }

  if (header) {
    let headerStr = '  ';
    for(let i = 0; i < numCols; i++) {
      const str = header[i] || ''
      headerStr += colors.underline(str);
      
      if (i < numCols - 1) {
        headerStr += spaces(colWidths[i] - str.length);
      }
    }
    message(headerStr);
  }
  
  
  
  for(let i = 0; i < data.length; i++) {
    let rowStr = '  ';
    const row = data[i]
    for(let j = 0; j < numCols; j++) {
      const str = row[j] || ''
      rowStr += str;
      if (j < numCols - 1) {
        rowStr += spaces(colWidths[j] - stripAnsi(str).length);
      }
    }
    message(rowStr)
  }
}
export default {
  empty,
  warn,
  error,
  info,
  header,
  footer,
  message,
  table
};
