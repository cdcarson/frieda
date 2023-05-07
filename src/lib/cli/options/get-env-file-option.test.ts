import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';
import { getEnvFileOption } from './get-env-file-option.js';
import * as validateEnvFileMod from './validate-env-file.js';
import * as promptEnvFileMod from './prompt-env-file.js';
describe('getEnvFileOption', () => {
  let validateSpy: SpyInstance;
  let promptSpy: SpyInstance;
  beforeEach(() => {
    validateSpy = vi.spyOn(validateEnvFileMod, 'validateEnvFile');
    promptSpy = vi.spyOn(promptEnvFileMod, 'promptEnvFile');
  });
  it('uses cli arg', async () => {
    validateSpy.mockResolvedValue({
      databaseUrl: 'ngfgng',
      envFile: '.env'
    });
    const result = await getEnvFileOption(
      { envFile: '.env' },
      { envFile: '.a' }
    );
    expect(result.value).toBe('.env');
    expect(promptSpy).not.toHaveBeenCalled();
  });
  it('uses rc', async () => {
    validateSpy.mockResolvedValue({
      databaseUrl: 'ngfgng',
      envFile: '.env'
    });
    const result = await getEnvFileOption({}, { envFile: '.a' });
    expect(result.value).toBe('.a');
    expect(promptSpy).not.toHaveBeenCalled();
  });
  it('prompts if error', async () => {
    validateSpy.mockRejectedValue(new Error('bad'));
    promptSpy.mockResolvedValue({
      databaseUrl: 'ngfgng',
      envFile: '.goo'
    });
    const result = await getEnvFileOption({}, { envFile: '.a' });
    expect(result.value).toBe('.goo');
    expect(promptSpy).toHaveBeenCalled();
  });
  it('prompts if promptAlways', async () => {
    validateSpy.mockResolvedValue({
      databaseUrl: 'ngfgng',
      envFile: '.a'
    });
    promptSpy.mockResolvedValue({
      databaseUrl: 'ngfgng',
      envFile: '.goo'
    });
    const result = await getEnvFileOption({}, { envFile: '.a' }, true);
    expect(result.value).toBe('.goo');
    expect(promptSpy).toHaveBeenCalled();
  });
});
