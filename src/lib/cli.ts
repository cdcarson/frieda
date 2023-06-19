#! /usr/bin/env node
import {main} from './app/main.js'
await main(process.cwd(), process.argv.slice(2));

