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
