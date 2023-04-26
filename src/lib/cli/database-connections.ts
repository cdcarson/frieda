import {
  createConnection,
  type Connection as Mysql2Connection
} from 'mysql2/promise';
import { connect, type Connection } from '@planetscale/database';
import fs from 'fs-extra';
import {PATH_TO_CERT} from './constants.js'
import { Mysql2CertificateReadError, Mysql2ConnectionError } from './errors.js';




export const getMysql2Connection = async (
  databaseUrl: string
): Promise<Mysql2Connection> => {
  let ca: Buffer | null = null;
  try {
    ca = await fs.readFile(PATH_TO_CERT);
  } catch (error) {
    throw new Mysql2CertificateReadError();
  }
  try {
    const connection = await createConnection({
      uri: databaseUrl,
      multipleStatements: true,
      ssl: {
        ca
      }
    });
    return connection;
  } catch (error) {
    throw new Mysql2ConnectionError(error)
  }
};

export const getServerlessConnection = (databaseUrl: string): Connection => {
  return connect({
    url: databaseUrl
  });
};

