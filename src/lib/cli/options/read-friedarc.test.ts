import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';
import * as getFileMod from '../fs/get-file.js';
import type { FileResult } from '../types.js';
import { readFriedarc } from './read-friedarc.js';
describe('readFriedarc', () => {
  let fileResult: FileResult;
  let getFileSpy: SpyInstance;
  beforeEach(() => {
    fileResult = {} as FileResult;
    getFileSpy = vi.spyOn(getFileMod, 'getFile');
  });

  it('is empty object if the file is not a file', async () => {
    fileResult.isFile = false;
    getFileSpy.mockResolvedValue(fileResult);
    const { rc, file } = await readFriedarc();
    expect(getFileSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is empty object if the json is empty', async () => {
    fileResult.isFile = true;
    fileResult.contents = '';
    getFileSpy.mockResolvedValue(fileResult);
    const { rc, file } = await readFriedarc();
    expect(getFileSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is empty object if the json is bad', async () => {
    fileResult.isFile = true;
    fileResult.contents = 'bad thing';
    getFileSpy.mockResolvedValue(fileResult);
    const { rc, file } = await readFriedarc();
    expect(getFileSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is empty object if the json is not an obj', async () => {
    fileResult.isFile = true;
    fileResult.contents = JSON.stringify([8, 9]);
    getFileSpy.mockResolvedValue(fileResult);
    const { rc, file } = await readFriedarc();
    expect(getFileSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is json if the json is good', async () => {
    fileResult.isFile = true;
    fileResult.contents = JSON.stringify({ a: 8 });
    getFileSpy.mockResolvedValue(fileResult);
    const { rc, file } = await readFriedarc();
    expect(getFileSpy).toHaveBeenCalled();
    expect(rc).toEqual({ a: 8 });
    expect(file).toEqual(fileResult);
  });
});
