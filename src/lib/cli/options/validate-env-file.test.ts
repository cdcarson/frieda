import { describe, it, expect, beforeEach, type SpyInstance, vi } from 'vitest';
import * as getFileMod from '../../fs/get-file.js';
import { validateEnvFile } from './validate-env-file.js';
import type { FileResult } from '../../fs/types.js';

describe('readEnvFileDatabaseUrl', () => {
  let fileResult: FileResult;
  let getSpy: SpyInstance;
  beforeEach(() => {
    getSpy = vi.spyOn(getFileMod, 'getFile');
    fileResult = {} as FileResult;
  });
  it('rejects if the file does not exist', async () => {
    fileResult.exists = false;
    getSpy.mockResolvedValue(fileResult);
    await expect(() => validateEnvFile('.xyz')).rejects.toThrowError('exist');
    expect(getSpy).toHaveBeenCalled();
  });
  it('rejects if the path is not a file', async () => {
    fileResult.exists = true;
    fileResult.isFile = false;
    getSpy.mockResolvedValue(fileResult);
    await expect(() => validateEnvFile('.xyz')).rejects.toThrowError('not');
    expect(getSpy).toHaveBeenCalled();
  });
  it('rejects if the file is not parseable', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = '';
    getSpy.mockResolvedValue(fileResult);
    await expect(() => validateEnvFile('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(getSpy).toHaveBeenCalled();
  });
  it('rejects if the file does not contain a database key', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'FOO=8';
    getSpy.mockResolvedValue(fileResult);
    await expect(() => validateEnvFile('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(getSpy).toHaveBeenCalled();
  });
  it('rejects if the file does not contains an empty  database key', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL=';
    getSpy.mockResolvedValue(fileResult);
    await expect(() => validateEnvFile('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(getSpy).toHaveBeenCalled();
  });
  it('rejects if the file does not contains an invalid  database key', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL=invalid';
    getSpy.mockResolvedValue(fileResult);
    await expect(() => validateEnvFile('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(getSpy).toHaveBeenCalled();
  });
  it('succeeds if the file contains a valid url', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL=mysql://a:b@c';
    getSpy.mockResolvedValue(fileResult);
    const result = await validateEnvFile('.xyz');
    expect(result.databaseUrl).toBe('mysql://a:b@c');
    expect(getSpy).toHaveBeenCalled();
  });
  it('succeeds if the file contains a valid quoted url', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL="mysql://a:b@c"';
    getSpy.mockResolvedValue(fileResult);
    const result = await validateEnvFile('.xyz');
    expect(result.databaseUrl).toBe('mysql://a:b@c');
    expect(getSpy).toHaveBeenCalled();
  });
  it('succeeds if the file contains a valid url as FRIEDA_DATABASE_URL', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'FRIEDA_DATABASE_URL=mysql://a:b@c';
    getSpy.mockResolvedValue(fileResult);
    const result = await validateEnvFile('.xyz');
    expect(result.databaseUrl).toBe('mysql://a:b@c');
    expect(getSpy).toHaveBeenCalled();
  });
});
