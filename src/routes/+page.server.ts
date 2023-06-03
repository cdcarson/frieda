import { CURRENT_SCHEMA_JSON_FILE_NAME } from '$lib/app/constants.js';
import { connect } from '@planetscale/database';
import fs from 'fs-extra'
export const load = async () => {
  const schemaFile = await fs.readFile(process.env.SCHEMA_DIRECTORY +'/' + CURRENT_SCHEMA_JSON_FILE_NAME, 'utf-8');
  const schema = JSON.parse(schemaFile)
  const connection = connect({url: process.env.DB_URL})
  return {schema, DB_URL: process.env.DB_URL, OUTPUT_DIRECTORY: process.env.OUTPUT_DIRECTORY,  COMPILE_JS: process.env.COMPILE_JS  };
};
