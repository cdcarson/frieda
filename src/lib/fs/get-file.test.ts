/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as getFsPathsMod from './get-fs-paths.js';
import fs from 'fs-extra';
import { getFile } from './get-file.js';

describe('getFile', () => {
  let stat: fs.Stats;
  beforeEach(() => {
    stat = {
      isFile: vi.fn()
    } as unknown as fs.Stats;
  });

  it('calls getPaths', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any);
    const spy = vi.spyOn(getFsPathsMod, 'getFsPaths');
    const result = await getFile('foo.json');
    expect(result).toBeTruthy();
    expect(spy).toHaveBeenCalledWith('foo.json');
  });
  it('works if stat rejects', async () => {
    const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('foo');
    const rfSpy = vi.spyOn(fs, 'readFile').mockResolvedValue('hey' as any);
    const isFileSpy = vi.spyOn(stat, 'isFile').mockReturnValue(true);
    const result = await getFile('foo.json');
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
    const result = await getFile('foo.json');
    expect(result.exists).toBe(true);
    expect(statSpy).toHaveBeenCalledWith(result.absolutePath);
    expect(isFileSpy).toHaveBeenCalledOnce();
    expect(rfSpy).toHaveBeenCalledWith(result.absolutePath, 'utf-8');
    expect(result.isFile).toBe(true);
    expect(result.contents).toBe('hey');
  });
});
