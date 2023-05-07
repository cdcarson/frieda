import ora from 'ora';
const fromStringOrArray = (message: string | string[]): string => {
  return (Array.isArray(message) ? message : [message])
    .map((s, i) => (i === 0 ? s : `  ${s}`))
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
export default {
  empty,
  warn,
  error,
  info
};
