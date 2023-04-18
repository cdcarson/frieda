const { version } = require('../package.json');
const fs = require('fs-extra');
const path = require('path');
fs.writeFileSync(
  path.join(process.cwd(), 'src', 'lib', 'version.ts'),
  `export const FRIEDA_VERSION = '${version}';`
);
