import stripAnsi from 'strip-ansi';


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