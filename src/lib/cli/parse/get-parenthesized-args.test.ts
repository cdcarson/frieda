import { it, describe, expect } from 'vitest';
import { getParenthesizedArgs } from './get-parenthesized-args.js';

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
  it('returns empty if no match', () => {
    expect(getParenthesizedArgs('foo(whatevs anyhow))', 'prefix')).toBe('');
  });
});
