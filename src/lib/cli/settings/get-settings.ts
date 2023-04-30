import type { FullSettings, RcSettings } from '../types.js';
import { getDatabaseUrl } from './get-database-url.js';
import { getOutputDirectory } from './get-output-directory.js';
import { readFriedaRc } from './read-friedarc.js';
import parser from 'yargs-parser';
import { promptSaveFriedarc } from './prompt-save-friedarc.js';
import { connect } from '@planetscale/database';
import { writeFriedaRc } from './write-friedarc.js';

export const getSettings = async (argv: string[]): Promise<FullSettings> => {
  const args = parser(argv, {
    alias: {
      'env-file': ['e'],
      'output-directory': ['o']
    },
    string: ['env-file', 'output-directory']
  });
  const changes: Partial<RcSettings> = {};
  const { settings: rcSettings, file: rcFile } = await readFriedaRc();
  const dbResult = await getDatabaseUrl({
    cli: args.envFile,
    rc: rcSettings.envFilePath
  });
  if (dbResult.envFilePath !== rcSettings.envFilePath) {
    changes.envFilePath = dbResult.envFilePath;
  }

  const out = await getOutputDirectory({
    cli: args.outputDirectory,
    rc: rcSettings.outputDirectory
  });
  if (out.relativePath !== rcSettings.outputDirectory) {
    changes.outputDirectory = out.relativePath;
  }
  const jsonTypeImports = (rcSettings.jsonTypeImports || []).filter(
    (s) => typeof s === 'string' && s.length > 0
  );
  if (Object.keys(changes).length > 0) {
    const save = await promptSaveFriedarc(rcFile);
    if (save) {
      await writeFriedaRc(rcFile, {
        ...rcSettings,
        ...changes
      })
    }
  }
  return {
    ...dbResult,
    connection: connect({url: dbResult.databaseUrl}),
    jsonTypeImports,
    outputDirectory: out.relativePath,
    typeBigIntAsString: rcSettings.typeBigIntAsString !== false,
    typeTinyIntOneAsBoolean: rcSettings.typeTinyIntOneAsBoolean !== false
  }
};
