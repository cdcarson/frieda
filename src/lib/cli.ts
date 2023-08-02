#! /usr/bin/env node
import { main } from './app-v2/main.js';
await main(process.cwd(), process.argv.slice(2));
