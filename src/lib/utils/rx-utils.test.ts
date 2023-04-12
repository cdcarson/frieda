import { describe, it, expect, beforeEach } from 'vitest';

import { getStringLiterals, getParenthesizedArgs, getMatchAmong } from './rx-utils.js';

describe('getStringLiterals', () => {
  it('should match single quotes', () => {
    expect(getStringLiterals(`'a','b'`)).toEqual([`'a'`, `'b'`]);
  });
  it('should match double quotes', () => {
    expect(getStringLiterals(`"a","b"`)).toEqual([`"a"`, `"b"`]);
  });
});

describe('getParenthesizedArgs', () => {
  it('should work', () => {
    expect(getParenthesizedArgs('prefix(whatevs anyhow)', 'prefix')).toBe(
      'whatevs anyhow'
    );
  });
  it('should work case-insensitively as far as the prefix', () => {
    expect(getParenthesizedArgs('prefix(whatevs anyhow)', 'PREfiX')).toBe(
      'whatevs anyhow'
    );
  });
  it('should work with spaces in between the prefix and the opening parenthesis', () => {
    expect(getParenthesizedArgs('prefix (whatevs anyhow)', 'prefix')).toBe(
      'whatevs anyhow'
    );
  });
  it('should work if there is a parenthesis in the parentheses', () => {
    expect(getParenthesizedArgs('prefix(whatevs (anyhow))', 'prefix')).toBe(
      'whatevs (anyhow)'
    );
    expect(getParenthesizedArgs('prefix(whatevs anyhow))', 'prefix')).toBe(
      'whatevs anyhow)'
    );
  });
  it('some actual use cases', () => {
    // parsing a MySQL enum...
    expect(getParenthesizedArgs(`enum('a', 'b')`, 'enum')).toBe(`'a', 'b'`);
    // parsing a MySQL enum...
    expect(getParenthesizedArgs(`set('a', 'b')`, 'set')).toBe(`'a', 'b'`);
    // parsing an annotation...
    expect(getParenthesizedArgs(`@json(MyType)`, '@json')).toBe(`MyType`);
    expect(
      getParenthesizedArgs(`@json({price: number, quantity: number})`, '@json')
    ).toBe(`{price: number, quantity: number}`);
  });
});

describe('getMatchAmong', () => {
  let choices: string[];
  beforeEach(() => {
    choices = ['a', 'b']
  })
  it('should return empty array if no match is found', () => {
    expect(getMatchAmong('enum', choices)).toEqual([])
  })
  it('should return an array if a match is found', () => {
    expect(getMatchAmong('a', choices)).toEqual(['a'])
  })
  it('should return an array if matches are found', () => {
    expect(getMatchAmong('a b', choices)).toEqual(['a', 'b'])
  })
  it('should be case insensitive by default', () => {
    expect(getMatchAmong('A', choices)).toEqual(['A'])
  })
  it('should be case sensitive if ignoreCase is false', () => {
    expect(getMatchAmong('A', choices, false)).toEqual([])
  })
  it('some actual use cases', () => {
    choices.push('tinyint');
    expect(getMatchAmong('tinyint(1)', choices)).toEqual(['tinyint'])
  })
})
