export const main = async (cwd: string, args: string[], env: Record<string,string|undefined>) => {
  console.log(cwd);
  console.log(args);
  console.log(env);
}