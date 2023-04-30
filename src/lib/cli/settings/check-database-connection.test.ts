import { describe, it, expect, beforeEach, vi, type SpyInstance, afterEach } from 'vitest';
import { checkDatabaseConnection } from './check-database-connection.js';


describe('checkDatabaseConnection', () => {
  let pscale: typeof import('@planetscale/database')
  beforeEach(async () => {
    vi.mock('@planetscale/database', async () => {
      const actual = await vi.importActual('@planetscale/database'); // Step 2.
      return {
        ...(actual as any),
        connect: vi.fn()
      };
    });
    pscale = await import('@planetscale/database');
  });
  
  it('should work', async () => {
    const execute = vi.fn(() => Promise.resolve());
    const spy = vi.spyOn(pscale, 'connect').mockReturnValue({ execute } as any);
    const conn = await checkDatabaseConnection('mysql://foo:bar@baz');
    expect(conn).toBeTruthy();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith({
      url: 'mysql://foo:bar@baz'
    });
    expect(execute).toHaveBeenCalledWith('SELECT 1 as `foo`');
  });
  it('should throw if connect throws', async () => {
    vi.spyOn(pscale, 'connect').mockImplementation(() => {
      throw new Error('invalid url');
    });
    await expect(() => checkDatabaseConnection('a')).rejects.toThrowError(
      'invalid url'
    );
  });
  it('should throw if the query throws', async () => {
    const execute = vi.fn(() => Promise.reject(new Error('unauth')));
    vi.spyOn(pscale, 'connect').mockReturnValue({ execute } as any);
    await expect(() => checkDatabaseConnection('a')).rejects.toThrowError(
      'unauth'
    );
  });
});
