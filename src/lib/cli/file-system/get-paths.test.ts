import { describe, it, expect, beforeEach } from 'vitest';
import { getPaths } from './get-paths.js';
describe('getPaths', () => {
  let cwd: string;
  beforeEach(() => {
    cwd = process.cwd();
  })

  it('has cwd', ()=> {
    expect(getPaths('foo').cwd).toBe(cwd)
  });
  it('has all the right keys', ()=> {
    const paths = getPaths('foo.json')
    expect(paths.relativePath).toBe('foo.json')
    expect(paths.absolutePath).toBe(cwd + '/foo.json')
    expect(paths.dirname).toBe(cwd)
    expect(paths.inputPath).toBe('foo.json')
    expect(paths.extname).toBe('.json')
    expect(paths.basename).toBe('foo.json')
  })
  it('strips trailing slash from everything except inputPath', ()=> {
    const paths = getPaths('foo/')
    expect(paths.relativePath).toBe('foo')
    expect(paths.absolutePath).toBe(cwd + '/foo')
    expect(paths.dirname).toBe(cwd)
    expect(paths.inputPath).toBe('foo/')
    expect(paths.extname).toBe('')
    expect(paths.basename).toBe('foo')
  });
  it('isUnderCwd', () => {
    expect(getPaths('../foo').isUnderCwd).toBe(false)
    expect(getPaths('.').isUnderCwd).toBe(false)
    expect(getPaths('./foo').isUnderCwd).toBe(true)
    expect(getPaths('foo').isUnderCwd).toBe(true)
  })
  
})