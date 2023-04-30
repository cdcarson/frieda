import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';
import type { DirectoryResult } from '../types.js';
import { getOutputDirectory } from './get-output-directory.js';
import * as valMod from './validate-output-directory.js';
import * as promptOutMod from './prompt-output-directory.js'
import * as promptNotEmptyMod from './prompt-output-directory-not-empty.js'
describe('getOutputDirectory', () => {
  let promptOutSpy: SpyInstance;
  let promptNotEmptySpy: SpyInstance
  let dir: DirectoryResult;
  let validateSpy: SpyInstance;
  beforeEach(() => {
    promptOutSpy = vi.spyOn(promptOutMod, 'promptOutputDirectory')
    promptNotEmptySpy = vi.spyOn(promptNotEmptyMod, 'promptOutputDirectoryNotEmpty')
    validateSpy = vi.spyOn(valMod, 'validateOutputDirectory')
    dir = {} as DirectoryResult;
  });
  it('succeeds if validateOutputDirectory resolves for the rc setting', async () => {
    validateSpy.mockResolvedValue(dir);
    const result = await getOutputDirectory({rc: 'f'});
    expect(validateSpy).toHaveBeenCalled();
    expect(promptOutSpy).not.toHaveBeenCalled();
  })

  
});
