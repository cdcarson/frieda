import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';
import { getDirectoryOption } from './get-directory-option.js';
import * as validateDirectoryMod from './validate-directory.js';
import * as promptDirectoryMod from './prompt-directory.js';
import * as promptDirectoryNotEmptyMod from './prompt-directory-not-empty.js';
describe('getDirectoryOption', () => {
  let validateDirectorySpy: SpyInstance;
  let promptDirectorySpy: SpyInstance;
  let promptDirectoryNotEmptySpy: SpyInstance;
  beforeEach(() => {
    validateDirectorySpy = vi.spyOn(validateDirectoryMod, 'validateDirectory');
    promptDirectoryNotEmptySpy = vi.spyOn(
      promptDirectoryNotEmptyMod,
      'promptDirectoryNotEmpty'
    );
    promptDirectorySpy = vi.spyOn(promptDirectoryMod, 'promptDirectory');
  });
  it('is ok with a cli arg', async () => {
    validateDirectorySpy.mockResolvedValue({
      relativePath: 'foo',
      isEmpty: true
    });
    const result = await getDirectoryOption(
      'codeDirectory',
      { codeDirectory: 'foo' },
      { codeDirectory: 'bar' }
    );
    expect(result.value).toBe('foo');
    expect(validateDirectorySpy).toHaveBeenCalled();
    expect(promptDirectoryNotEmptySpy).not.toHaveBeenCalled();
    expect(promptDirectorySpy).not.toHaveBeenCalled();
  });
  it('is ok with rc', async () => {
    validateDirectorySpy.mockResolvedValue({
      relativePath: 'bar',
      isEmpty: true
    });
    const result = await getDirectoryOption(
      'codeDirectory',
      {},
      { codeDirectory: 'bar' }
    );
    expect(result.value).toBe('bar');
    expect(validateDirectorySpy).toHaveBeenCalled();
    expect(promptDirectoryNotEmptySpy).not.toHaveBeenCalled();
    expect(promptDirectorySpy).not.toHaveBeenCalled();
  });
  it('checks if the directory is not empty', async () => {
    validateDirectorySpy.mockResolvedValue({
      relativePath: 'foo',
      isEmpty: false
    });
    promptDirectoryNotEmptySpy.mockResolvedValue(true);
    await getDirectoryOption(
      'codeDirectory',
      { codeDirectory: 'foo' },
      { codeDirectory: 'bar' }
    );
    expect(validateDirectorySpy).toHaveBeenCalled();
    expect(promptDirectoryNotEmptySpy).toHaveBeenCalled();
    expect(promptDirectorySpy).not.toHaveBeenCalled();
  });
  it('prompts if promptAlways is true', async () => {
    promptDirectorySpy.mockResolvedValue({
      relativePath: 'baz',
      isEmpty: true
    });
    await getDirectoryOption(
      'codeDirectory',
      { codeDirectory: 'foo' },
      { codeDirectory: 'bar' },
      true
    );
    expect(promptDirectorySpy).toHaveBeenCalled();
  });
  it('prompts if path missing is true', async () => {
    promptDirectorySpy.mockResolvedValue({
      relativePath: 'baz',
      isEmpty: true
    });
    await getDirectoryOption('codeDirectory', {}, {});
    expect(promptDirectorySpy).toHaveBeenCalled();
  });
  it('prompts if path missing is invalid', async () => {
    validateDirectorySpy.mockRejectedValue(new Error('bad'));
    promptDirectorySpy.mockResolvedValue({
      relativePath: 'baz',
      isEmpty: true
    });
    await getDirectoryOption('codeDirectory', {}, { codeDirectory: '../foo' });
    expect(promptDirectorySpy).toHaveBeenCalled();
  });
  it('reprompts if the directory is not empty and the user does not confirm', async () => {
    validateDirectorySpy.mockResolvedValue({
      relativePath: 'foo',
      isEmpty: false
    });
    promptDirectoryNotEmptySpy.mockResolvedValue(false);
    promptDirectorySpy.mockResolvedValue({
      relativePath: 'baz',
      isEmpty: true
    });
    await getDirectoryOption(
      'codeDirectory',
      { codeDirectory: 'foo' },
      { codeDirectory: 'bar' }
    );
    expect(validateDirectorySpy).toHaveBeenCalled();
    expect(promptDirectoryNotEmptySpy).toHaveBeenCalled();
    expect(promptDirectorySpy).toHaveBeenCalled();
  });
});
