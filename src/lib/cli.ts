#! /usr/bin/env node
import { main } from './app/main.js';
// import { Cli } from './app/cli.js';
// const cli = new Cli(process.cwd(), process.argv.slice(2));
await main(process.cwd(), process.argv.slice(2));
