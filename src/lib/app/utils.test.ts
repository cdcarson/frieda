/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';

import {
  isPlainObject,
  squishWords,
  getStdOutCols,
  prompt,
  onUserCancelled,
  promptValidateString,
  getParenthesizedArgs
} from './utils.js';
import prompts from 'prompts';

vi.mock('./log');
describe('onUserCancelled', () => {
  it('works', () => {
    const spy = vi.spyOn(process, 'exit').mockReturnValue({} as never);
    onUserCancelled();
    expect(spy).toHaveBeenCalled();
  });
});

describe('isPlainObject', () => {
  it('is true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 8 })).toBe(true);
  });
  it('is false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
  });
  it('is false for date', () => {
    expect(isPlainObject(new Date())).toBe(false);
  });
});

describe('promptValidateString', () => {
  it('works', () => {
    expect(promptValidateString('')).toEqual(expect.any(String));
    expect(promptValidateString('  ')).toEqual(expect.any(String));
    expect(promptValidateString('hey')).toEqual(true);
  });
});

describe('getStdOutCols', () => {
  it('works', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi
      .spyOn(process, 'stdout', 'get')
      .mockReturnValue({ columns: 100 } as any);
    expect(getStdOutCols()).toBe(100);
    expect(spy).toHaveBeenCalled();
  });
});

describe('squishWords', () => {
  it('works', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = vi
      .spyOn(process, 'stdout', 'get')
      .mockReturnValue({ columns: 100 } as any);
    squishWords('shgjhsgjh');
    expect(spy).toHaveBeenCalled();
  });
  it('works if passee line width', () => {
    const spy = vi
      .spyOn(process, 'stdout', 'get')
      .mockReturnValue({ columns: 100 } as any);
    squishWords('shgjhsgjh', 40);
    expect(spy).toHaveBeenCalled();
  });
});

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

describe('getParenthesizedArgs', () => {
  it('works', () => {
    expect(getParenthesizedArgs('tinyint(1)', 'tinyint')).toBe('1');
    expect(getParenthesizedArgs('tinyint(1)', 'TINYINT')).toBe('1');
    expect(getParenthesizedArgs(`set('a','b')`, 'set')).toBe(`'a','b'`);
    expect(getParenthesizedArgs(`set( )`, 'set')).toBe(` `);
  });
});
