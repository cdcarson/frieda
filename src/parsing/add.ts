export const add = (...args: number[]): number => {
  return args.reduce((a, b) => a + b, 0)
}
