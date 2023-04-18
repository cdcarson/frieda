#! /usr/bin/env node
import { config } from 'dotenv';
import { main } from './cli/index.js';

try {
  config();
  await main(process.cwd(), process.argv.slice(2), process.env);
} catch (error) {
  console.log(error);
  process.exit(1);
}

export default {};
