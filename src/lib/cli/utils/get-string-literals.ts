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
