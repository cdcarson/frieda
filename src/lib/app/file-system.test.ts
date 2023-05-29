/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs-extra';
import prettier from 'prettier';
import { FileSystem } from './file-system.js';

describe('FileSystem', () => {
  let fileSystem: FileSystem;
  let testCwd: string;
  beforeEach(() => {
    testCwd = '/a/b';
    fileSystem = new FileSystem(testCwd);
  });
  describe('saveFile', () => {
    it('works', async () => {
      const ensureSpy = vi.spyOn(fs, 'ensureFile').mockResolvedValue();
      const writeSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
      const result = await fileSystem.saveFile('foo.json', 'hey');
      expect(result.absolutePath).toBe(testCwd + '/foo.json');
      expect(ensureSpy).toHaveBeenCalledWith(result.absolutePath);
      expect(writeSpy).toHaveBeenCalledWith(result.absolutePath, 'hey');
    });
  });

  describe('prettifyAndSaveFile', () => {
    it('works', async () => {
      const relpath = 'foo.json';
      const paths = fileSystem.getPathResult(relpath);
      const getPathsSpy = vi
        .spyOn(fileSystem, 'getPathResult')
        .mockReturnValue(paths);
      const configSpy = vi.spyOn(prettier, 'resolveConfig');
      const fmtSpy = vi.spyOn(prettier, 'format');
      const saveSpy = vi.spyOn(fileSystem, 'saveFile').mockResolvedValue(paths);
      const result = await fileSystem.prettifyAndSaveFile(relpath, '{}');
      expect(result).toEqual(paths);
      expect(getPathsSpy).toHaveBeenCalledTimes(1);
      expect(configSpy).toHaveBeenCalledWith(paths.absolutePath);
      expect(fmtSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
    });
    it('works with extname', async () => {
      const relpath = 'foo.rc';
      const paths = fileSystem.getPathResult(relpath);
      const getPathsSpy = vi
        .spyOn(fileSystem, 'getPathResult')
        .mockReturnValue(paths);
      const configSpy = vi.spyOn(prettier, 'resolveConfig');
      const fmtSpy = vi.spyOn(prettier, 'format');
      const saveSpy = vi.spyOn(fileSystem, 'saveFile').mockResolvedValue(paths);
      const result = await fileSystem.prettifyAndSaveFile(
        relpath,
        '{}',
        'json'
      );
      expect(result).toEqual(paths);
      expect(getPathsSpy).toHaveBeenCalledTimes(1);
      expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
      expect(fmtSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
    });
    it('works with dotted extname', async () => {
      const relpath = 'foo.rc';
      const paths = fileSystem.getPathResult(relpath);
      const getPathsSpy = vi
        .spyOn(fileSystem, 'getPathResult')
        .mockReturnValue(paths);
      const configSpy = vi.spyOn(prettier, 'resolveConfig');
      const fmtSpy = vi.spyOn(prettier, 'format');
      const saveSpy = vi.spyOn(fileSystem, 'saveFile').mockResolvedValue(paths);
      const result = await fileSystem.prettifyAndSaveFile(
        relpath,
        '{}',
        '.json'
      );
      expect(result).toEqual(paths);
      expect(getPathsSpy).toHaveBeenCalledTimes(1);
      expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
      expect(fmtSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
    });
  });
  describe('getDirectory', () => {
    it('calls getPaths and stat', async () => {
      const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('x');
      const getPathsSpy = vi.spyOn(fileSystem, 'getPathResult');
      const result = await fileSystem.getDirectory('foo');
      expect(result).toBeTruthy();
      expect(getPathsSpy).toHaveBeenCalledWith('foo');
      expect(statSpy).toHaveBeenCalledWith(testCwd + '/foo');
    });
    it('works if stat rejects (dir does not exist)', async () => {
      const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('x');
      const readdirSpy = vi.spyOn(fs, 'readdir');
      const result = await fileSystem.getDirectory('foo');

      expect(result).toBeTruthy();
      expect(statSpy).toHaveBeenCalledWith(testCwd + '/foo');
      expect(readdirSpy).not.toHaveBeenCalled();
      expect(result.exists).toBe(false);
      expect(result.isDirectory).toBe(false);
      expect(result.isEmpty).toBe(true);
    });
    it('works if stat resolves (path  exists) but is not a dir', async () => {
      const stat: any = { isDirectory: () => false };
      const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
      const readdirSpy = vi.spyOn(fs, 'readdir');
      const result = await fileSystem.getDirectory('foo');

      expect(result).toBeTruthy();
      expect(statSpy).toHaveBeenCalledWith(testCwd + '/foo');
      expect(readdirSpy).not.toHaveBeenCalled();
      expect(result.exists).toBe(true);
      expect(result.isDirectory).toBe(false);
      expect(result.isEmpty).toBe(true);
    });
    it('works if stat resolves (path  exists) and is a dir', async () => {
      const stat: any = { isDirectory: () => true };
      const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
      const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValue([] as any);
      const result = await fileSystem.getDirectory('foo');

      expect(result).toBeTruthy();
      expect(statSpy).toHaveBeenCalledWith(testCwd + '/foo');
      expect(readdirSpy).toHaveBeenCalled();
      expect(result.exists).toBe(true);
      expect(result.isDirectory).toBe(true);
      expect(result.isEmpty).toBe(true);
    });
    it('works if stat resolves (path  exists) and is a non-empty dir', async () => {
      const stat: any = { isDirectory: () => true };
      const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
      const readdirSpy = vi
        .spyOn(fs, 'readdir')
        .mockResolvedValue(['a'] as any);
      const result = await fileSystem.getDirectory('foo');

      expect(result).toBeTruthy();
      expect(statSpy).toHaveBeenCalledWith(testCwd + '/foo');
      expect(readdirSpy).toHaveBeenCalled();
      expect(result.exists).toBe(true);
      expect(result.isDirectory).toBe(true);
      expect(result.isEmpty).toBe(false);
    });
  });

  describe('getFileResult', () => {
    let stat: fs.Stats;
    beforeEach(() => {
      stat = {
        isFile: vi.fn()
      } as unknown as fs.Stats;
    });

    it('calls getPaths', async () => {
      vi.spyOn(fs, 'stat').mockResolvedValue(stat as any);
      const spy = vi.spyOn(fileSystem, 'getPathResult');
      const result = await fileSystem.getFileResult('foo.json');
      expect(result).toBeTruthy();
      expect(spy).toHaveBeenCalledWith('foo.json');
    });
    it('works if stat rejects', async () => {
      const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('foo');
      const rfSpy = vi.spyOn(fs, 'readFile').mockResolvedValue('hey' as any);
      const isFileSpy = vi.spyOn(stat, 'isFile').mockReturnValue(true);
      const result = await fileSystem.getFileResult('foo.json');
      expect(result.exists).toBe(false);
      expect(statSpy).toHaveBeenCalledWith(result.absolutePath);
      expect(rfSpy).not.toHaveBeenCalled();
      expect(isFileSpy).not.toHaveBeenCalled();
      expect(result.isFile).toBe(false);
    });
    it('works if stat resolves', async () => {
      const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat as any);
      const rfSpy = vi.spyOn(fs, 'readFile').mockResolvedValue('hey' as any);
      const isFileSpy = vi.spyOn(stat, 'isFile').mockReturnValue(true);
      const result = await fileSystem.getFileResult('foo.json');
      expect(result.exists).toBe(true);
      expect(statSpy).toHaveBeenCalledWith(result.absolutePath);
      expect(isFileSpy).toHaveBeenCalledOnce();
      expect(rfSpy).toHaveBeenCalledWith(result.absolutePath, 'utf-8');
      expect(result.isFile).toBe(true);
      expect(result.contents).toBe('hey');
    });
  });

  describe('getPathResult', () => {
    it('has cwd', () => {
      expect(fileSystem.getPathResult('foo').cwd).toBe(testCwd);
    });
    it('has all the right keys', () => {
      const paths = fileSystem.getPathResult('foo.json');
      expect(paths.relativePath).toBe('foo.json');
      expect(paths.absolutePath).toBe(testCwd + '/foo.json');
      expect(paths.dirname).toBe(testCwd);
      expect(paths.inputPath).toBe('foo.json');
      expect(paths.extname).toBe('.json');
      expect(paths.basename).toBe('foo.json');
    });
    it('strips trailing slash from everything except inputPath', () => {
      const paths = fileSystem.getPathResult('foo/');
      expect(paths.relativePath).toBe('foo');
      expect(paths.absolutePath).toBe(testCwd + '/foo');
      expect(paths.dirname).toBe(testCwd);
      expect(paths.inputPath).toBe('foo/');
      expect(paths.extname).toBe('');
      expect(paths.basename).toBe('foo');
    });
    it('isUnderCwd', () => {
      expect(fileSystem.getPathResult('../foo').isUnderCwd).toBe(false);
      expect(fileSystem.getPathResult('.').isUnderCwd).toBe(false);
      expect(fileSystem.getPathResult('./foo').isUnderCwd).toBe(true);
      expect(fileSystem.getPathResult('foo').isUnderCwd).toBe(true);
    });
  });
});
