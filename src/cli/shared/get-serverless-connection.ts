import { connect, type Connection } from '@planetscale/database';

export const getServerlessConnection = (databaseUrl: string): Connection => {
  return connect({
    url: databaseUrl
  });
};