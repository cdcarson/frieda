import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';

import { promptDirectory } from './prompt-directory.js';
import * as validateDirectoryMod from './validate-directory.js';
import * as promptMod from '../ui/prompt.js';
describe('promptDirectory', () => {
  let validateSpy: SpyInstance;
  let promptSpy: SpyInstance;
  beforeEach(() => {
    validateSpy = vi.spyOn(validateDirectoryMod, 'validateDirectory');
    promptSpy = vi.spyOn(promptMod, 'prompt');
  });
  it('works', async () => {
    validateSpy.mockResolvedValue({
      relativePath: 'foo'
    });
    promptSpy.mockResolvedValue('foo');
    const result = await promptDirectory('codeDirectory', 'bar');
    expect(result.relativePath).toBe('foo');
  });
  it('tries again', async () => {
    validateSpy.mockResolvedValue({
      relativePath: 'foo'
    });
    promptSpy.mockResolvedValue('foo');
    validateSpy.mockRejectedValueOnce(new Error('bad'));
    const result = await promptDirectory('codeDirectory', 'bar');
    expect(result.relativePath).toBe('foo');
    expect(promptSpy).toHaveBeenCalledTimes(2);
  });
});
