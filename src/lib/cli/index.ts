#! /usr/bin/env node
import { hideBin } from 'yargs/helpers';

import { main } from './main.js';

main(hideBin(process.argv));
