import { describe, it, expect, vi } from 'vitest';
import * as pathsMod from './get-fs-paths.js';
import * as saveMod from './save-file.js';
import prettier from 'prettier';
import { prettifyAndSaveFile } from './prettify-and-save-file.js';

describe('prettifyAndSaveFile', () => {
  it('works', async () => {
    const relpath = 'foo.json';
    const paths = pathsMod.getFsPaths(relpath);
    const getPathsSpy = vi.spyOn(pathsMod, 'getFsPaths').mockReturnValue(paths);
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(saveMod, 'saveFile').mockResolvedValue(paths);
    const result = await prettifyAndSaveFile('foo.json', '{}');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath);
    expect(fmtSpy).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
  });
  it('works with extname', async () => {
    const relpath = '.friedarc';
    const paths = pathsMod.getFsPaths(relpath);
    const getPathsSpy = vi.spyOn(pathsMod, 'getFsPaths').mockReturnValue(paths);
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(saveMod, 'saveFile').mockResolvedValue(paths);
    const result = await prettifyAndSaveFile('foo.json', '{}', 'json');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
    expect(fmtSpy).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
  });
  it('works with dotted extname', async () => {
    const relpath = '.friedarc';
    const paths = pathsMod.getFsPaths(relpath);
    const getPathsSpy = vi.spyOn(pathsMod, 'getFsPaths').mockReturnValue(paths);
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(saveMod, 'saveFile').mockResolvedValue(paths);
    const result = await prettifyAndSaveFile('foo.json', '{}', '.json');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
    expect(fmtSpy).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
  });
});
