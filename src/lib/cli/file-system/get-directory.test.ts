import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDirectory } from './get-directory.js';
import fs from 'fs-extra';
import * as getPathsMod from './get-paths.js'

describe('getDirectory', () => {
 
  let cwd: string;
  beforeEach(() => {
    cwd = process.cwd();
  });
  it('calls getPaths and stat', async () => {
    const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('x');
    const getPathsSpy = vi.spyOn(getPathsMod, 'getPaths');
    const result = await getDirectory('foo');
    expect(result).toBeTruthy();
    expect(getPathsSpy).toHaveBeenCalledWith('foo');
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
  });
  
  it('works if stat rejects (dir does not exist)', async () => {
    const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('x');
    const readdirSpy = vi.spyOn(fs, 'readdir');
    const result = await getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).not.toHaveBeenCalled();
    expect(result.exists).toBe(false);
    expect(result.isDirectory).toBe(false);
    expect(result.isEmpty).toBe(true);
  });
  it('works if stat resolves (path  exists) but is not a dir', async () => {
    const stat: any = { isDirectory: () => false };
    const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
    const readdirSpy = vi.spyOn(fs, 'readdir');
    const result = await getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).not.toHaveBeenCalled();
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(false);
    expect(result.isEmpty).toBe(true);
  });
  it('works if stat resolves (path  exists) and is a dir', async () => {
    const stat: any = { isDirectory: () => true };
    const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
    const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValue([] as any);
    const result = await getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).toHaveBeenCalled();
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.isEmpty).toBe(true);
  });
  it('works if stat resolves (path  exists) and is a non-empty dir', async () => {
    const stat: any = { isDirectory: () => true };
    const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
    const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValue(['a'] as any);
    const result = await getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).toHaveBeenCalled();
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.isEmpty).toBe(false);
  });
});


