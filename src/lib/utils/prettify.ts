import prettier from 'prettier';
export const prettify = async (code: string, relativePath: string, opts: prettier.Options = {}) => {
  const config = await prettier.resolveConfig(relativePath);
  return prettier.format(code, {
    ...config,
    filepath: relativePath,
    ...opts
  });
}