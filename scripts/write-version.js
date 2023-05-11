import pkg from '../package.json' assert {
  type: 'json',
};
import fs from 'fs-extra';
import {join} from 'node:path'
fs.writeFileSync(
  join(process.cwd(), 'src', 'lib', 'version.ts'),
  `export const FRIEDA_VERSION = '${pkg.version}';`
);
