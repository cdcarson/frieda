import type { EnvFileDatabaseUrl } from '../types.js';
import { fmtPath, fmtErr } from '../utils.js';
import { promptEnvFilePath } from './prompt-env-file-path.js';
import { readEnvFileDatabaseUrl } from './read-env-file-database-url.js';
import ora from 'ora';


export const getDatabaseUrl = async (
  paths: {cli?: string, rc?: string }
): Promise<EnvFileDatabaseUrl> => {

  for(const p of [paths.cli, paths.rc, '.env']) {
    if (typeof p === 'string' && p.length > 0) {
      const msg =`Reading database URL from env file ${fmtPath(p)}.`
      const spinner = ora(msg);
      try {
        const result = await readEnvFileDatabaseUrl(p);
        spinner.succeed();
        return result;
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(`${msg} ${fmtErr(error.message)}`)
          return await promptEnvFilePath(p);
        }
        throw error;
      }
    }
  }
  return await promptEnvFilePath('.env');
};
