#! /usr/bin/env node
import { main } from './cli/index.js';
try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
export default {};
