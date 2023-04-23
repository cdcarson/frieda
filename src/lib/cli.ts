#! /usr/bin/env node
import { main } from './cli/index.js';

try {
  await main();
} catch (error) {
  console.log(error);
  process.exit(1);
}

export default {};
