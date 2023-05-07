import { describe, it, expect, beforeEach, type SpyInstance, vi } from 'vitest';

import * as cmdFieldMod from './cmd-field/cmd.js';
import * as cmdInitMod from './cmd-init/cmd.js';
import * as cmdModelMod from './cmd-model/cmd.js';
import * as cmdGenMod from './cmd-generate/cmd.js';
import * as helpMod from './ui/show-help.js';
import * as logHeader from './ui/log-header.js'
import { main } from './main.js';

describe('main', () => {
  let cmdFieldSpy: SpyInstance;
  let cmdInitSpy: SpyInstance;
  let cmdModelSpy: SpyInstance;
  let cmdGenerateSpy: SpyInstance;
  let showHelpSpy: SpyInstance;
  let showHelpForCommandSpy: SpyInstance;
  beforeEach(() => {
    vi.spyOn(logHeader, 'logHeader').mockResolvedValue()
    cmdFieldSpy = vi.spyOn(cmdFieldMod, 'cmd').mockResolvedValue();
    cmdInitSpy = vi.spyOn(cmdInitMod, 'cmd').mockResolvedValue();
    cmdModelSpy = vi.spyOn(cmdModelMod, 'cmd').mockResolvedValue();
    cmdGenerateSpy = vi.spyOn(cmdGenMod, 'cmd').mockResolvedValue();
    showHelpSpy = vi.spyOn(helpMod, 'showHelp').mockReturnValue();
    showHelpForCommandSpy = vi
      .spyOn(helpMod, 'showHelpForCommand')
      .mockReturnValue();
  });
  it('command generate', async () => {
    await main(['generate']);
    expect(cmdGenerateSpy).toHaveBeenCalledTimes(1);
    await main(['g']);
    expect(cmdGenerateSpy).toHaveBeenCalledTimes(2);
    await main(['g', '-h']);
    expect(cmdGenerateSpy).toHaveBeenCalledTimes(2);
    expect(showHelpForCommandSpy).toHaveBeenCalledTimes(1);
  });
  it('command init', async () => {
    await main(['init']);
    expect(cmdInitSpy).toHaveBeenCalledTimes(1);
    await main(['i']);
    expect(cmdInitSpy).toHaveBeenCalledTimes(2);
    await main(['i', '-h']);
    expect(cmdInitSpy).toHaveBeenCalledTimes(2);
    expect(showHelpForCommandSpy).toHaveBeenCalledTimes(1);
  });
  it('command field', async () => {
    await main(['field']);
    expect(cmdFieldSpy).toHaveBeenCalledTimes(1);
    await main(['f']);
    expect(cmdFieldSpy).toHaveBeenCalledTimes(2);
    await main(['field', '-h']);
    expect(cmdFieldSpy).toHaveBeenCalledTimes(2);
    expect(showHelpForCommandSpy).toHaveBeenCalledTimes(1);
  });
  it('command model', async () => {
    await main(['model']);
    expect(cmdModelSpy).toHaveBeenCalledTimes(1);
    await main(['m']);
    expect(cmdModelSpy).toHaveBeenCalledTimes(2);
    await main(['model', '-h']);
    expect(cmdModelSpy).toHaveBeenCalledTimes(2);
    expect(showHelpForCommandSpy).toHaveBeenCalledTimes(1);
  });
  it('no command', async () => {
    await main([]);
    expect(showHelpSpy).toHaveBeenCalledTimes(1);
    await main(['-h']);
    expect(showHelpSpy).toHaveBeenCalledTimes(2);
  });
});
