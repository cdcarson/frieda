import { intro, isCancel, log, outro, select } from "@clack/prompts";
import { COMMANDS } from "./shared/commands.js";
import colors from 'picocolors'
import { getSettings } from "./shared/settings.js";
import { fetchSchema, writeSchema, fetchTableInfo } from "./shared/schema.js";
import { cancelAndExit, getServerlessConnection } from "./shared/utils.js";
import { getModelSchemas } from "./shared/generate.js";
import { promptModel } from "./shared/show.js";
import fs from 'fs-extra'
import { join } from "path";
export const cmdShow = async (restArgs: string[]) => {
  const cmd = COMMANDS.show;
  intro(`${colors.bold(cmd.id)}${colors.dim(`: ${cmd.description}`)}`);
  const settings = await getSettings();
  const conn = getServerlessConnection(settings.databaseUrl)
  const schema = await fetchSchema(conn)
  await fs.writeJSON(join(settings.schemaDirectory as string, 'schema.json'), schema, {spaces: 1})

  outro(colors.bold('Done.'));
  // console.dir(model, {depth: null});
  // console.log(create?.tableCreateStatement)
  // console.dir(tableInfo.columns.filter(c => c.Key !== ''), {depth: null})
  // console.dir(tableInfo.indexes.map(i => i.Key_name), {depth: null})
  // console.log(tableInfo.tableCreateStatement)
}