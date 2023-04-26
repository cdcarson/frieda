export const findFlag = (
  args: string[],
  flag: string,
  alias?: string
): { found: boolean; remainingArgs: string[] } => {
  const foundIndex = args.findIndex(
    (arg) =>
      arg === `--${flag}` || (typeof alias === 'string' && arg === `-${alias}`)
  );
  if (foundIndex < 0) {
    return {found: false, remainingArgs: [...args]}
  }
  const remainingArgs = [...args];
  remainingArgs.splice(foundIndex, 1);
  return {remainingArgs, found: true}
};


