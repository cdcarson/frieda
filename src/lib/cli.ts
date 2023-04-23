#! /usr/bin/env node
import { main } from './cli/index.js';
import inquirer from 'inquirer';

try {
  await main();
} catch (error) {
  console.log(error);
  process.exit(1);
}

export default {};
