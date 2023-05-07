import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';

import { promptEnvFile } from './prompt-env-file.js';
import * as validateMod from './validate-env-file.js';
import * as promptMod from '../ui/prompt.js';

describe('promptEnvFile', () => {
  let validateSpy: SpyInstance;
  let promptSpy: SpyInstance;
  beforeEach(() => {
    validateSpy = vi.spyOn(validateMod, 'validateEnvFile');
    promptSpy = vi.spyOn(promptMod, 'prompt');
  });
  it('works', async () => {
    validateSpy.mockResolvedValue({
      url: 'abc',
      envFile: '.foo'
    });
    promptSpy.mockResolvedValue('.foo');
    const result = await promptEnvFile('codeDirectory', 'bar');
    expect(result.envFile).toBe('.foo');
  });
  it('tries again', async () => {
    validateSpy.mockResolvedValue({
      url: 'abc',
      envFile: '.foo'
    });
    promptSpy.mockResolvedValue('foo');
    validateSpy.mockRejectedValueOnce(new Error('bad'));
    const result = await promptEnvFile('codeDirectory', 'bar');
    expect(result.envFile).toBe('.foo');
    expect(promptSpy).toHaveBeenCalledTimes(2);
  });
});
