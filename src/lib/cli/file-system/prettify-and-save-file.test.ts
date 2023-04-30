import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as saveFileMod from './save-file.js';
import * as getPathsMod from './get-paths.js';
import fs from 'fs-extra';
import { prettifyAndSaveFile } from './prettify-and-save-file.js';
import prettier from 'prettier'
describe('.prettifyAndSaveFile', () => {
  let cwd: string;
  beforeEach(() => {
    cwd = process.cwd();
  });
  it('works', async () => {
    const relpath = 'foo.json';
    const paths = getPathsMod.getPaths(relpath)
    const getPathsSpy = vi.spyOn(getPathsMod, 'getPaths').mockReturnValue(paths)
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(saveFileMod, 'saveFile').mockResolvedValue(paths);
    const result = await prettifyAndSaveFile('foo.json', '{}');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath);
    expect(fmtSpy).toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  });
  it('works with extname', async () => {
    const relpath = '.friedarc';
    const paths = getPathsMod.getPaths(relpath)
    const getPathsSpy = vi.spyOn(getPathsMod, 'getPaths').mockReturnValue(paths)
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(saveFileMod, 'saveFile').mockResolvedValue(paths);
    const result = await prettifyAndSaveFile('foo.json', '{}', 'json');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
    expect(fmtSpy).toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  });
  it('works with dotted extname', async () => {
    const relpath = '.friedarc';
    const paths = getPathsMod.getPaths(relpath)
    const getPathsSpy = vi.spyOn(getPathsMod, 'getPaths').mockReturnValue(paths)
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(saveFileMod, 'saveFile').mockResolvedValue(paths);
    const result = await prettifyAndSaveFile('foo.json', '{}', '.json');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
    expect(fmtSpy).toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  });
  
});