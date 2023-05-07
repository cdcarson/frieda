/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';

import { getStdOutCols, squishWords } from './formatters.js';

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
