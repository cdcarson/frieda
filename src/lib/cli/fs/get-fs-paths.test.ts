import { describe, it, expect, beforeEach } from 'vitest';
import { getFsPaths } from './get-fs-paths.js';

describe('getPaths', () => {
  let cwd: string;
  beforeEach(() => {
    cwd = process.cwd();
  });

  it('has cwd', () => {
    expect(getFsPaths('foo').cwd).toBe(cwd);
  });
  it('has all the right keys', () => {
    const paths = getFsPaths('foo.json');
    expect(paths.relativePath).toBe('foo.json');
    expect(paths.absolutePath).toBe(cwd + '/foo.json');
    expect(paths.dirname).toBe(cwd);
    expect(paths.inputPath).toBe('foo.json');
    expect(paths.extname).toBe('.json');
    expect(paths.basename).toBe('foo.json');
  });
  it('strips trailing slash from everything except inputPath', () => {
    const paths = getFsPaths('foo/');
    expect(paths.relativePath).toBe('foo');
    expect(paths.absolutePath).toBe(cwd + '/foo');
    expect(paths.dirname).toBe(cwd);
    expect(paths.inputPath).toBe('foo/');
    expect(paths.extname).toBe('');
    expect(paths.basename).toBe('foo');
  });
  it('isUnderCwd', () => {
    expect(getFsPaths('../foo').isUnderCwd).toBe(false);
    expect(getFsPaths('.').isUnderCwd).toBe(false);
    expect(getFsPaths('./foo').isUnderCwd).toBe(true);
    expect(getFsPaths('foo').isUnderCwd).toBe(true);
  });
});
