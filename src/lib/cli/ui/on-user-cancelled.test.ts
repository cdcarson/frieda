import { describe, it, expect, vi } from 'vitest';
import { onUserCancelled } from './on-user-cancelled.js';
vi.mock('./log');
describe('onUserCancelled', () => {
  it('works', () => {
    const spy = vi.spyOn(process, 'exit').mockReturnValue({} as never);
    onUserCancelled();
    expect(spy).toHaveBeenCalled();
  });
});
