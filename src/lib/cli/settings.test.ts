import { describe, it, expect, beforeEach, type SpyInstance, vi } from 'vitest';
import { isValidDatabaseURL, readFriedaRc } from './settings.js';
import fs from 'fs-extra';
describe('isValidDatabaseURL', () => {
  const good = [`mysql://u:p@aws.connect.psdb.cloud`, `mysql://u:p@h`];
  const bad = [
    `u:p@aws.connect.psdb.cloud`,
    `mysql://u:p@`,
    `mysql://u:@aws.connect.psdb.cloud`,
    'mysql://:p@aws.connect.psdb.cloud'
  ];
  it('is true for good ones', () => {
    good.forEach((s) => {
      expect(isValidDatabaseURL(s)).toBe(true);
    });
  });
  it('is false for bad ones', () => {
    bad.forEach((s) => {
      expect(isValidDatabaseURL(s)).toBe(false);
    });
  });
});

describe('readFriedaRc', () => {
  it('is empty object if the file does not exist', async () => {
    const existsSpy = vi
      .spyOn(fs, 'exists')
      .mockImplementation(() => Promise.resolve(false));
    const readSpy = vi.spyOn(fs, 'readFile');
    const result = await readFriedaRc();
    expect(result).toEqual({});
    expect(existsSpy).toHaveBeenCalledOnce();
    expect(readSpy).not.toHaveBeenCalled();
  });

  it('is empty object if the file is empty', async () => {
    const existsSpy = vi
      .spyOn(fs, 'exists')
      .mockImplementation(() => Promise.resolve(true));
    const readSpy = vi.spyOn(fs, 'readFile').mockImplementation(() => '');
    const result = await readFriedaRc();
    expect(result).toEqual({});
    expect(existsSpy).toHaveBeenCalledOnce();
    expect(readSpy).toHaveBeenCalledOnce();
  });
  it('is empty object if the file does not have valid json', async () => {
    const existsSpy = vi
      .spyOn(fs, 'exists')
      .mockImplementation(() => Promise.resolve(true));
    const readSpy = vi.spyOn(fs, 'readFile').mockImplementation(() => 'bad');
    const result = await readFriedaRc();
    expect(result).toEqual({});
    expect(existsSpy).toHaveBeenCalledOnce();
    expect(readSpy).toHaveBeenCalledOnce();
  });
  it('is empty object if the json is not a plain object', async () => {
    vi.spyOn(fs, 'exists').mockImplementation(() => Promise.resolve(true));
    vi.spyOn(fs, 'readFile').mockImplementation(() => '[]');
    const result = await readFriedaRc();
    expect(result).toEqual({});
  });
  it('is the parsed contents of the file', async () => {
    vi.spyOn(fs, 'exists').mockImplementation(() => Promise.resolve(true));
    vi.spyOn(fs, 'readFile').mockImplementation(() => '{"a":8}');
    const result = await readFriedaRc();
    expect(result).toEqual({ a: 8 });
  });
});
