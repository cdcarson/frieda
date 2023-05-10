import { describe, it, expect } from 'vitest';
import prompts from 'prompts';
import {promptBooleanOption} from './prompt-boolean-option.js'

describe('promptBooleanOption', () => {
  it('works', async () => {
    prompts.inject([true, false]);
    expect(await promptBooleanOption('foo', false)).toBe(true);
    expect(await promptBooleanOption('foo', true)).toBe(false);
  });
});
