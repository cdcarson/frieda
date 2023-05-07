import { describe, it, expect, beforeEach } from 'vitest';
import { getMatchAmong } from './get-match-among.js';
describe('getMatchAmong', () => {
  let choices: string[];
  beforeEach(() => {
    choices = ['a', 'b'];
  });
  it('should return empty array if no match is found', () => {
    expect(getMatchAmong('enum', choices)).toEqual([]);
  });
  it('should return an array if a match is found', () => {
    expect(getMatchAmong('a', choices)).toEqual(['a']);
  });
  it('should return an array if matches are found', () => {
    expect(getMatchAmong('a b', choices)).toEqual(['a', 'b']);
  });
  it('should be case insensitive by default', () => {
    expect(getMatchAmong('A', choices)).toEqual(['A']);
  });
  it('should be case sensitive if ignoreCase is false', () => {
    expect(getMatchAmong('A', choices, false)).toEqual([]);
  });
  it('some actual use cases', () => {
    choices.push('tinyint');
    expect(getMatchAmong('tinyint(1)', choices)).toEqual(['tinyint']);
  });
});
