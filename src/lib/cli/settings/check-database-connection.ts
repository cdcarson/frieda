import { connect } from '@planetscale/database';
export const checkDatabaseConnection = async (
  databaseUrl: string
): Promise<string> => {
  const conn = connect({ url: databaseUrl });
  await conn.execute('SELECT 1 as `foo`');
  return databaseUrl;
};
