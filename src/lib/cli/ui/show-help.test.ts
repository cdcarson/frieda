import { describe, it, expect, vi } from 'vitest';
import { showHelp, showHelpForCommand } from './show-help.js';
describe('showHelp', () => {
  it('showHelp', () => {
    const spy = vi.spyOn(console, 'log');
    showHelp();
    expect(spy).toHaveBeenCalled();
  });
  it('showHelpForCommand', () => {
    const spy = vi.spyOn(console, 'log');
    showHelpForCommand({
      description: 'foo',
      name: 'bar',
      usage: 'baz',
      alias: 'b',
      longDescription: 'yaba',
      options: [
        {
          description: 'sjsj',
          isRcOption: true,
          name: 'jdgfdgg',
          type: 'boolean',
          alias: 'j'
        },
        {
          description: 'sjsj',
          isRcOption: true,
          name: 'hkjhkjh',
          type: 'boolean'
        }
      ],
      positionals: [
        {
          name: 'hdgjdg',
          description: 'hdgjdhg'
        }
      ]
    });
    expect(spy).toHaveBeenCalled();
  });
  it('showHelpForCommand is ok with no opts', () => {
    const spy = vi.spyOn(console, 'log');
    showHelpForCommand({
      description: 'foo',
      name: 'bar',
      usage: 'baz',
      alias: 'b',
      longDescription: 'yaba'
    });
    expect(spy).toHaveBeenCalled();
  });
});
