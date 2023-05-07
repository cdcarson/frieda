/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import * as oramod from 'ora';
import log from './log.js';
vi.mock('ora');

describe('log', () => {
  it('has an empty fn', () => {
    const spy = vi.spyOn(console, 'log');
    log.empty();
    expect(spy).toHaveBeenCalledWith();
  });
  it('has a warn fn', () => {
    const warn = vi.fn();
    const oraSpy = vi.spyOn(oramod, 'default').mockReturnValue({ warn } as any);
    log.warn('this is a test of log.warn');
    expect(oraSpy).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
  it('has an error fn', () => {
    const fail = vi.fn();
    const oraSpy = vi.spyOn(oramod, 'default').mockReturnValue({ fail } as any);
    log.error('this is a test of log.error');
    expect(oraSpy).toHaveBeenCalled();
    expect(fail).toHaveBeenCalled();
  });
  it('warn works with arrays', () => {
    const warn = vi.fn();
    const oraSpy = vi.spyOn(oramod, 'default').mockReturnValue({ warn } as any);
    log.warn(['a', 'b']);
    expect(oraSpy).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});
