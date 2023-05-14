import { describe, it, expect, beforeEach, vi } from 'vitest';
import { removeRecognizedFiles } from './remove-recognized-files.js';
import fs from 'fs-extra';
describe('removeRecognizedFiles', () => {
  it('removes the files', async () => {
    const spy = vi.spyOn(fs, 'remove').mockResolvedValue();
    await removeRecognizedFiles('foo/bar');
    expect(spy).toHaveBeenCalledWith('foo/bar/database.ts');
    expect(spy).toHaveBeenCalledWith('foo/bar/schema.ts');
    expect(spy).toHaveBeenCalledWith('foo/bar/types.ts');
  });
});
