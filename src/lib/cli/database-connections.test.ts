import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import fs from 'fs-extra';
import * as mysql from 'mysql2/promise';
import * as serverless from '@planetscale/database';
import {
  getServerlessConnection,
  getMysql2Connection,
} from './database-connections';
import { PATH_TO_CERT } from './constants';

vi.mock('@planetscale/database', async () => {
  const actual = await vi.importActual('@planetscale/database'); // Step 2.
  return {
    ...(actual as any),
    connect: vi.fn()
  };
});
vi.mock('mysql2/promise', async () => {
  const actual = await vi.importActual('mysql2/promise'); // Step 2.
  return {
    ...(actual as any),
    createConnection: vi.fn()
  };
});



describe('getServerlessConnection', () => {
  it('should work', () => {
    const spy = vi.spyOn(serverless, 'connect').mockReturnValue({} as any);
    const conn = getServerlessConnection('mysql://foo:bar@baz');
    expect(conn).toBeTruthy();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith({
      url: 'mysql://foo:bar@baz'
    })
  });
});



describe('getMysql2Connection', () => {
  let readFileSpy: SpyInstance;
  let createConnectionSpy: SpyInstance;
  let buff: Buffer;
  beforeEach(() => {
    buff = Buffer.from('s');
    readFileSpy = vi.spyOn(fs, 'readFile');
    createConnectionSpy = vi.spyOn(mysql, 'createConnection');
  })
  it('should work', async () => {
    readFileSpy.mockResolvedValue(buff);
    createConnectionSpy.mockResolvedValue({})
    const conn = await getMysql2Connection('mysql://foo:bar@baz');
    expect(conn).toEqual({})
    expect(readFileSpy).toHaveBeenCalledWith(PATH_TO_CERT);
    expect(createConnectionSpy).toHaveBeenCalledWith({
      uri: 'mysql://foo:bar@baz',
      multipleStatements: true,
      ssl: {
        ca: buff
      }
    })
  });
  it('throws if the cert cannot be read', async () => {
    readFileSpy.mockRejectedValue('oops');
    await expect(() => getMysql2Connection('a')).rejects.toThrowError(PATH_TO_CERT);
    expect(createConnectionSpy).not.toHaveBeenCalled()
  })
  it('throws if the connection fails',async () => {
    readFileSpy.mockResolvedValue(buff);
    createConnectionSpy.mockRejectedValue('oops');
    await expect(() => getMysql2Connection('a')).rejects.toThrow();
  })
});

// describe('getMysql2Connection', () => {

// })
