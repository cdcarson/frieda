#! /usr/bin/env node

import fs from 'fs-extra';
import { join } from 'node:path';
fs.writeFileSync(
  join(process.cwd(), 'src', 'lib', 'version.ts'),
  `export const FRIEDA_VERSION = '${process.env.npm_package_version}';`
);
