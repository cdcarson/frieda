import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveFile } from './save-file.js';
import fs from 'fs-extra';

describe('saveFile', () => {
  let cwd: string;
  beforeEach(() => {
    cwd = process.cwd();
  });
  it('works', async () => {
    const ensureSpy = vi.spyOn(fs, 'ensureFile').mockResolvedValue();
    const writeSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    const result = await saveFile('foo.json', 'hey');
    expect(result.absolutePath).toBe(cwd + '/foo.json');
    expect(ensureSpy).toHaveBeenCalledWith(result.absolutePath);
    expect(writeSpy).toHaveBeenCalledWith(result.absolutePath, 'hey');
  });

});