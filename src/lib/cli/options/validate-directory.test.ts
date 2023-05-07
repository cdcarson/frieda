import { describe, it, expect, beforeEach, type SpyInstance, vi } from 'vitest';
import type { DirectoryResult } from '../types.js';
import * as getDirMod from '../fs/get-directory.js';
import { validateDirectory } from './validate-directory.js';

describe('validateDirectory', () => {
  let dirResult: DirectoryResult;
  let getSpy: SpyInstance;
  beforeEach(() => {
    dirResult = {} as DirectoryResult;
    getSpy = vi.spyOn(getDirMod, 'getDirectory');
  });

  it('rejects if the path exists and is not a directory', async () => {
    dirResult.relativePath = 'foo';
    dirResult.exists = true;
    dirResult.isDirectory = false;
    getSpy.mockResolvedValue(dirResult);
    await expect(() =>
      validateDirectory('foo', 'schemaDirectory')
    ).rejects.toThrowError('a file');
    expect(getSpy).toHaveBeenCalled();
  });
  it('rejects if the path is outside the current working dir', async () => {
    dirResult.relativePath = '../foo';
    dirResult.exists = true;
    dirResult.isDirectory = true;
    dirResult.isUnderCwd = false;
    getSpy.mockResolvedValue(dirResult);
    await expect(() =>
      validateDirectory('foo', 'schemaDirectory')
    ).rejects.toThrowError('working');
    expect(getSpy).toHaveBeenCalled();
  });
  it('works', async () => {
    dirResult.relativePath = 'foo';
    dirResult.exists = true;
    dirResult.isDirectory = true;
    dirResult.isUnderCwd = true;
    getSpy.mockResolvedValue(dirResult);
    const result = await validateDirectory('foo', 'schemaDirectory');
    expect(result).toEqual(dirResult);
    expect(getSpy).toHaveBeenCalled();
  });
});
