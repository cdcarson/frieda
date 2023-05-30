import type { Code } from './code.js';
import type { Options } from './options.js';
import { join, dirname, basename } from 'node:path';
import prettier from 'prettier';
import { log } from './utils.js';
import kleur from 'kleur';
export const showQuickStart = ( options: Options) => {
  const fakeFileDir = dirname(options.outputDirectory);
  const fakeFilePath = join(
    fakeFileDir,
    'get-db.' + (options.compileJs ? 'js' : 'ts')
  );
  const top = `
    // ${fakeFilePath}
    import { AppDb } from './${basename(options.outputDirectory)}/database.js';
    import { connect } from '@planetscale/database';
    import { ${
      options.databaseDetails.databaseUrlKey
    } } from '$env/static/private';
  `;
  const bot = `export default getDb;`;
  const c = options.compileJs
    ? `
  ${top}
  /** @type {AppDb|undefined} */
  let db;
  /**
   * @returns {AppDb}
   */
  const getDb = () => {
    if (!db) {
      db = new AppDb(connect({ url: DATABASE_URL }));
    }
    return db;
  };
  ${bot}
  `
    : `
  ${top}
  let db: AppDb|undefined;
  const getDb = ():AppDb => {
    if (!db) {
      db = new AppDb(connect({ url: DATABASE_URL }));
    }
    return db;
  };
  ${bot}
  `;
  const prettified = prettier.format(c, {
    ...options.prettierOptions,
    filepath: fakeFilePath,
    printWidth: 50,
    useTabs: false,
    semi: true
  });
  log.info([
    kleur.bold('Quick start'),
    ...prettified.split('\n').map(s => kleur.gray(s))
  ])
};
