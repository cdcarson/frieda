import { fetchTableInfos } from './fetch-table-infos.js';
import type { Connection } from '@planetscale/database';
export const introspectShared = async (
  connection: Connection
): Promise<string> => {
  const infos = await fetchTableInfos(connection);
  const d = new Date()
  const introspectedComment = `-- Introspected at ${d.toUTCString()}\n\n`;
  const contents =
    introspectedComment +
    infos.map((o) => `-- ${o.name}\n${o.tableCreateStatement}`).join(`\n\n`);
  return contents;
};
