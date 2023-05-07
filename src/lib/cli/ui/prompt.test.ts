import { describe, it, expect } from 'vitest';
import prompts from 'prompts';
import { prompt } from './prompt.js';
describe('prompt', () => {
  it('works', async () => {
    prompts.inject(['hey']);
    const result = await prompt({
      name: 'resp',
      type: 'text',
      message: 'Hey'
    });
    expect(result).toBe('hey');
  });
});
