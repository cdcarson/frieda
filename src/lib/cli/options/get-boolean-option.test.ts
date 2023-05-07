import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';
import { getBooleanOption } from './get-boolean-option.js';
import * as promptMod from '../ui/prompt.js';
vi.mock('../ui/log.js');
describe('getBooleanOption', () => {
  let promptSpy: SpyInstance;
  beforeEach(() => {
    promptSpy = vi.spyOn(promptMod, 'prompt');
  });
  it('prompts if promptAlways is true', async () => {
    promptSpy.mockResolvedValue(true);
    const result = await getBooleanOption(
      'outputJs',
      {},
      { outputJs: false },
      false,
      true
    );
    expect(result.value).toBe(true);
    expect(promptSpy).toHaveBeenCalled();
  });
  it('is ok if no value', async () => {
    const result = await getBooleanOption('outputJs', {}, {}, false);
    expect(result.value).toBe(false);
  });
  it('uses cli arg', async () => {
    const result = await getBooleanOption(
      'outputJs',
      { outputJs: true },
      { outputJs: false },
      false
    );
    expect(result.value).toBe(true);
  });
  it('uses rc', async () => {
    const result = await getBooleanOption(
      'outputJs',
      {},
      { outputJs: true },
      false
    );
    expect(result.value).toBe(true);
  });
});
