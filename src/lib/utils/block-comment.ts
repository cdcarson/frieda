export const blockComment = (lines: string[]): string => {
  return [
    '/**',
    ...lines.map(l => ` * ${l}`),
    ' */'

  ].join('\n')
}