import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';

import * as getBoolMod from './get-boolean-option.js';
import * as getDirMod from './get-directory-option.js';
import * as getEnvMod from './get-env-file-option.js';
import * as promptMod from '../ui/prompt.js';
import * as saveMod from '../fs/prettify-and-save-file.js';

import { getOptions } from './get-options.js';
import type { DirectoryResult, FileResult } from '../types.js';

describe('getOptions', () => {
  let boolSpy: SpyInstance;
  let dirSpy: SpyInstance;
  let envSpy: SpyInstance;
  beforeEach(() => {
    boolSpy = vi.spyOn(getBoolMod, 'getBooleanOption').mockResolvedValue({
      value: false,
      source: 'default'
    });
    dirSpy = vi.spyOn(getDirMod, 'getDirectoryOption').mockResolvedValue({
      value: 'foo',
      source: 'rc',
      directory: {
        relativePath: 'foo'
      } as DirectoryResult
    });
    envSpy = vi.spyOn(getEnvMod, 'getEnvFileOption').mockResolvedValue({
      value: '.env',
      source: 'rc',
      databaseUrl: {
        envFile: '.env',
        databaseUrl: 'mysql://u:p@h',
        databaseUrlKey: 'aa'
      }
    });
  });
  it('works', async () => {
    vi.spyOn(promptMod, 'prompt').mockResolvedValue(false);
    await getOptions({});
    expect(boolSpy).toHaveBeenCalled();
    expect(dirSpy).toHaveBeenCalled();
    expect(envSpy).toHaveBeenCalled();
  });
  it('saves the rc file', async () => {
    const spy = vi
      .spyOn(saveMod, 'prettifyAndSaveFile')
      .mockResolvedValue({} as FileResult);
    vi.spyOn(promptMod, 'prompt').mockResolvedValue(true);
    await getOptions({});
    expect(spy).toHaveBeenCalled();
  });
});
