import { createConnection, type Connection } from 'mysql2/promise';
import fs from 'fs-extra'
export const getMysql2Connection = async(databaseUrl: string): Promise<Connection> => {
  let ca: Buffer|null = null;
  try {
    ca = await fs.readFile('/etc/ssl/cert.pem')
  } catch (error) {
    throw Error('Could not read /etc/ssl/cert.pem')
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
    throw Error('Could not connect to the database.')
  }
}
