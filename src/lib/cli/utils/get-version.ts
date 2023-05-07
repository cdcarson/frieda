import fs from 'fs-extra'
export const getVersion = async (): Promise<string> => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8'));
  return pkg.version;
}

