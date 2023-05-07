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
