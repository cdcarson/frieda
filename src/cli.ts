#! /usr/bin/env node
import { main } from './cli/index.js';
import { VERSION } from './version.js';
try {
  await main(VERSION);
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
export default {};
