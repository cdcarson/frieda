import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type SpyInstance,
  afterEach
} from 'vitest';
import * as prompts from '@clack/prompts';
import {
  promptTypeBigIntAsString,
  promptTinyIntOneAsBoolean,
  promptOutputDirectory
} from './cmd-init.js';
import * as cli from './cli.js';
import * as settings from './settings.js';
vi.mock('./settings.js', async () => {
  const actual: typeof import('./settings.js') = await vi.importActual(
    './settings.js'
  ); // Step 2.
  return {
    ...actual,
    validateOutputDirectory: vi.fn()
  };
});
vi.mock('./cli.js', async () => {
  const actual: typeof import('./cli.js') = await vi.importActual('./cli.js'); // Step 2.
  return {
    ...actual,
    cancelAndExit: vi.fn()
  };
});
vi.mock('@clack/prompts', async () => {
  const actual: typeof import('@clack/prompts') = await vi.importActual(
    '@clack/prompts'
  ); // Step 2.
  return {
    ...actual,
    isCancel: vi.fn(),
    confirm: vi.fn(),
    text: vi.fn(),
    log: {
      ...actual.log,
      message: vi.fn()
    }
  };
});

describe('promptTypeBigIntAsString and promptTinyIntOneAsBoolean', async () => {
  let logSpy: SpyInstance;
  let confirmSpy: SpyInstance;
  let isCancelSpy: SpyInstance;
  let cancelAndExitSpy: SpyInstance;
  beforeEach(() => {
    cancelAndExitSpy = vi
      .spyOn(cli, 'cancelAndExit')
      .mockImplementation((() => 'cancel') as any);
    logSpy = vi.spyOn(prompts.log, 'message').mockImplementation(() => {});
    confirmSpy = vi.spyOn(prompts, 'confirm');
    isCancelSpy = vi.spyOn(prompts, 'isCancel');
  });
  afterEach(() => {
    vi.resetAllMocks();
  });
  it('calls confirm', async () => {
    for (const fn of [promptTypeBigIntAsString, promptTinyIntOneAsBoolean]) {
      confirmSpy.mockResolvedValueOnce(true);
      let value = await fn({});
      expect(confirmSpy).toHaveBeenCalled();
      expect(value).toBe(true);
    }
  });
  it('calls cancelAndExit', async () => {
    for (const fn of [promptTypeBigIntAsString, promptTinyIntOneAsBoolean]) {
      confirmSpy.mockResolvedValueOnce(true);
      isCancelSpy.mockReturnValueOnce(true);
      let value = await fn({});
      expect(confirmSpy).toHaveBeenCalled();
      expect(value).toBe('cancel');
    }
  });
});

describe('promptOutputDirectory', () => {
  let logSpy: SpyInstance;
  let textSpy: SpyInstance;
  let confirmSpy: SpyInstance;
  let isCancelSpy: SpyInstance;
  let cancelAndExitSpy: SpyInstance;
  let validateOutputDirectorySpy: SpyInstance;
  beforeEach(() => {
    cancelAndExitSpy = vi
      .spyOn(cli, 'cancelAndExit')
      .mockImplementation((() => 'cancel') as any);
    logSpy = vi.spyOn(prompts.log, 'message').mockImplementation(() => {});
    confirmSpy = vi.spyOn(prompts, 'confirm');
    textSpy = vi.spyOn(prompts, 'text');
    isCancelSpy = vi.spyOn(prompts, 'isCancel');
    validateOutputDirectorySpy = vi.spyOn(settings, 'validateOutputDirectory');
  });
  it('should work', async () => {
    textSpy.mockReturnValueOnce('foo-bar-does-not-exist');
    validateOutputDirectorySpy.mockResolvedValueOnce({
      exists: false
    });
    const result = await promptOutputDirectory(
      {},
      'generatedCodeDirectory',
      'path:'
    );
    expect(result).toEqual({ exists: false });
  });
  it('should work if the dir is not empty', async () => {
    textSpy.mockReturnValueOnce('foo-bar-does-not-exist');
    confirmSpy.mockResolvedValueOnce(true);
    validateOutputDirectorySpy.mockResolvedValueOnce({
      exists: true,
      isEmpty: false
    });
    const result = await promptOutputDirectory(
      {},
      'generatedCodeDirectory',
      'path:'
    );
    expect(result).toEqual({ exists: true, isEmpty: false });
    expect(confirmSpy).toHaveBeenCalled();
  });
});
