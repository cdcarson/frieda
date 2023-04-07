const { version } = require('../package.json');
const fs = require('fs-extra')
const path = require('path');
console.log('writing version');
fs.writeFileSync(path.join(process.cwd(), 'src', 'version.ts'), `export const VERSION = '${version}';`)