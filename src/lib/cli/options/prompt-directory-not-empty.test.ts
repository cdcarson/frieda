import { describe, it, expect } from 'vitest';
import prompts from 'prompts';
import { promptDirectoryNotEmpty } from './prompt-directory-not-empty.js';

describe('promptDirectoryNotEmpty', () => {
  it('works', async () => {
    prompts.inject([true, false]);
    expect(await promptDirectoryNotEmpty('foo')).toBe(true);
    expect(await promptDirectoryNotEmpty('foo')).toBe(false);
  });
});
