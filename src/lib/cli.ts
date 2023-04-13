#!/usr/bin/node
import { main } from './cli/index.js';
import { config} from 'dotenv'

config();
try {
  await main(process.cwd(), process.argv.slice(2), process.env)
} catch (error) {
  console.log(error);
  process.exit(1);
}


