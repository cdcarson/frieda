import { describe, it, expect, beforeEach } from 'vitest';
import { findFlag } from './parse-args.js';

describe('findFlag', () => {
  it('is true if the flag is found', () => {
    expect(findFlag(['-b', '--help'], 'help').found).toBe(true)
    expect(findFlag(['-b', '-h'], 'help', 'h').found).toBe(true)
    expect(findFlag(['--help', '-b' ], 'help').found).toBe(true)
    expect(findFlag(['-h', '-b' ], 'help', 'h').found).toBe(true)
  })
  it('is removes the element if the flag is found', () => {
    expect(findFlag(['-b', '--help'], 'help').remainingArgs).toEqual(['-b'])
    expect(findFlag(['-b', '-h'], 'help', 'h').remainingArgs).toEqual(['-b'])
    expect(findFlag(['--help', '-b' ], 'help').remainingArgs).toEqual(['-b'])
    expect(findFlag(['-h', '-b' ], 'help', 'h').remainingArgs).toEqual(['-b'])
    expect(findFlag(['--alt', '-h', '-b' ], 'help', 'h').remainingArgs).toEqual(['--alt', '-b'])
  })
})