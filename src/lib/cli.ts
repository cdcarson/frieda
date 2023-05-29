#! /usr/bin/env node

import { Cli } from './app/cli.js';
const cli = new Cli(process.cwd(), process.argv.slice(2));
await cli.execute();
