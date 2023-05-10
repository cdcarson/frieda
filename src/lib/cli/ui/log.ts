import ora from 'ora';
import { getStdOutCols } from '../utils/formatters.js';
import colors from 'kleur'
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
  const before = Math.floor((width -( title.length + 2))/2);
  console.log(colors.dim(`${'-'.repeat(before)} ${title} ${'-'.repeat(before)}`))
}
const footer = () => {
  console.log(colors.dim('-'.repeat(getStdOutCols())))
}
const message = (message: string | string[]) => {
  console.log(fromStringOrArray(message, 0))
}
export default {
  empty,
  warn,
  error,
  info,
  header,
  footer,
  message
};
