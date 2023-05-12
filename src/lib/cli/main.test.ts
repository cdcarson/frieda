import { describe, it, expect, beforeEach, type SpyInstance, vi } from 'vitest';

import * as cmdFieldMod from './cmd-field.js';
import * as cmdInitMod from './cmd-init.js';
import * as cmdModelMod from './cmd-model.js';
import * as cmdGenMod from './cmd-generate.js';
import { main } from './main.js';

describe('main', () => {
  let cmdFieldSpy: SpyInstance;
  let cmdInitSpy: SpyInstance;
  let cmdModelSpy: SpyInstance;
  let cmdGenerateSpy: SpyInstance;

  beforeEach(() => {
    cmdFieldSpy = vi.spyOn(cmdFieldMod, 'cmdField').mockResolvedValue();
    cmdInitSpy = vi.spyOn(cmdInitMod, 'cmdInit').mockResolvedValue();
    cmdModelSpy = vi.spyOn(cmdModelMod, 'cmdModel').mockResolvedValue();
    cmdGenerateSpy = vi.spyOn(cmdGenMod, 'cmdGenerate').mockResolvedValue();
  });
  it('command generate', async () => {
    await main(['generate']);
    expect(cmdGenerateSpy).toHaveBeenCalledTimes(1);
    await main(['g']);
    expect(cmdGenerateSpy).toHaveBeenCalledTimes(2);
  });
  it('command init', async () => {
    await main(['init']);
    expect(cmdInitSpy).toHaveBeenCalledTimes(1);
    await main(['i']);
    expect(cmdInitSpy).toHaveBeenCalledTimes(2);
  });
  it('command field', async () => {
    await main(['field']);
    expect(cmdFieldSpy).toHaveBeenCalledTimes(1);
    await main(['f']);
    expect(cmdFieldSpy).toHaveBeenCalledTimes(2);
  });
  it('command model', async () => {
    await main(['model']);
    expect(cmdModelSpy).toHaveBeenCalledTimes(1);
    await main(['m']);
    expect(cmdModelSpy).toHaveBeenCalledTimes(2);
  });
});
