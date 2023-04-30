import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cli } from './cli.class.js';
import fs from 'fs-extra';
import prettier from 'prettier';
import prompts from 'prompts';
import * as ora from 'ora'
import { FRIEDA_RC_FILE_NAME } from './constants.js';
import type { DirectoryResult, FileResult } from './types.js';

vi.mock('prompts', async () => {
  const actual: typeof import('prompts') = await vi.importActual('prompts');
  return {
    ...actual,
    prompt: vi.fn()
  }
})


vi.mock('ora', async () => {
  const actual: typeof import('ora') = await vi.importActual('ora');
  return {
    ...actual,
    default: vi.fn()
  }
})



describe('Cli.isValidDatabaseURL', () => {
 
  let cli: Cli;
  
  beforeEach(() => {
    cli = new Cli();
   
  });

  const good = [`mysql://u:p@aws.connect.psdb.cloud`, `mysql://u:p@h`,];
  const bad = [
    new Date(),
    `u:p@aws.connect.psdb.cloud`,
    `mysql://u:p@`,
    `mysql://u:@aws.connect.psdb.cloud`,
    'mysql://:p@aws.connect.psdb.cloud'
  ];
  it('is true for good ones', () => {
    good.forEach((s) => {
      expect(cli.isValidDatabaseURL(s)).toBe(true);
    });
  });

  it('is false for bad ones', () => {
    bad.forEach((s) => {
      expect(cli.isValidDatabaseURL(s)).toBe(false);
    });
  });
});

describe('Cli.readEnvFileDatabaseUrl', () => {
  let cli: Cli;
  let fileResult: FileResult;
  beforeEach(() => {
    cli = new Cli();
    fileResult = {} as FileResult;
  });

  it('rejects if the file does not exist', async () => {
    fileResult.exists = false;
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    await expect(() => cli.readEnvFileDatabaseUrl('.xyz')).rejects.toThrowError(
      'exist'
    );
    expect(readSpy).toHaveBeenCalled();
  });
  it('rejects if the path is not a file', async () => {
    fileResult.exists = true;
    fileResult.isFile = false;
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    await expect(() => cli.readEnvFileDatabaseUrl('.xyz')).rejects.toThrowError(
      'not'
    );
    expect(readSpy).toHaveBeenCalled();
  });
  it('rejects if the file is not parseable', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = '';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    await expect(() => cli.readEnvFileDatabaseUrl('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(readSpy).toHaveBeenCalled();
  });
  it('rejects if the file does not contain a database key', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'FOO=8';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    await expect(() => cli.readEnvFileDatabaseUrl('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(readSpy).toHaveBeenCalled();
  });
  it('rejects if the file does not contains an empty  database key', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL=';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    await expect(() => cli.readEnvFileDatabaseUrl('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(readSpy).toHaveBeenCalled();
  });
  it('rejects if the file does not contains an invalid  database key', async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL=invalid';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    await expect(() => cli.readEnvFileDatabaseUrl('.xyz')).rejects.toThrowError(
      'DATABASE_URL'
    );
    expect(readSpy).toHaveBeenCalled();
  });
  it('succeeds if the file contains a valid url',async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL=mysql://a:b@c';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    const result = await cli.readEnvFileDatabaseUrl('.xyz');
    expect(result.databaseUrl).toBe('mysql://a:b@c')
    expect(readSpy).toHaveBeenCalled();
  })
  it('succeeds if the file contains a valid quoted url',async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'DATABASE_URL="mysql://a:b@c"';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    const result = await cli.readEnvFileDatabaseUrl('.xyz');
    expect(result.databaseUrl).toBe('mysql://a:b@c')
    expect(readSpy).toHaveBeenCalled();
  })
  it('succeeds if the file contains a valid url as FRIEDA_DATABASE_URL',async () => {
    fileResult.exists = true;
    fileResult.isFile = true;
    fileResult.contents = 'FRIEDA_DATABASE_URL=mysql://a:b@c';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    const result = await cli.readEnvFileDatabaseUrl('.xyz');
    expect(result.databaseUrl).toBe('mysql://a:b@c')
    expect(readSpy).toHaveBeenCalled();
  })

})

describe('Cli.validateDirectory', () => {
  let cli: Cli;
  let dirResult: DirectoryResult;
  beforeEach(() => {
    cli = new Cli()
    dirResult = {} as DirectoryResult;
  });

  it('rejects if the path is empty', async () => {
    
    const getSpy = vi.spyOn(cli, 'getDirectory');
    await expect(() => cli.validateDirectory('', 'schemaDirectory')).rejects.toThrowError(
      'Missing'
    );
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('rejects if the path exists and is not a directory', async () => {
    dirResult.relativePath = 'foo'
    dirResult.exists = true;
    dirResult.isDirectory = false
    const getSpy = vi.spyOn(cli, 'getDirectory').mockResolvedValue(dirResult);
    await expect(() => cli.validateDirectory('foo', 'schemaDirectory')).rejects.toThrowError(
      'a file'
    );
    expect(getSpy).toHaveBeenCalled();
  });
  it('rejects if the path is outside the current working dir', async () => {
    dirResult.relativePath = '../foo'
    dirResult.exists = true;
    dirResult.isDirectory = true;
    dirResult.isUnderCwd = false;
    const getSpy = vi.spyOn(cli, 'getDirectory').mockResolvedValue(dirResult);
    await expect(() => cli.validateDirectory('foo', 'schemaDirectory')).rejects.toThrowError(
      'working'
    );
    expect(getSpy).toHaveBeenCalled();
  });
  it('works', async () => {
    dirResult.relativePath = 'foo'
    dirResult.exists = true;
    dirResult.isDirectory = true;
    dirResult.isUnderCwd = true;
    const getSpy = vi.spyOn(cli, 'getDirectory').mockResolvedValue(dirResult);
    const result = await  cli.validateDirectory('foo', 'schemaDirectory');
    expect(result).toEqual(dirResult)
    expect(getSpy).toHaveBeenCalled();
  })
  

})

describe('Cli', () => {
  let cli: Cli;
  beforeEach(() => {
    cli = new Cli()
  });
  it('is a thing', () => {
    expect(cli).toBeTruthy();
  })
})

describe('Cli.getPaths', () => {
  let cli: Cli;
  let cwd: string;
  beforeEach(() => {
    cli = new Cli();
    cwd = process.cwd();
  });
  it('has cwd', () => {
    expect(cli.getPaths('foo').cwd).toBe(cwd);
  });
  it('has all the right keys', () => {
    const paths = cli.getPaths('foo.json');
    expect(paths.relativePath).toBe('foo.json');
    expect(paths.absolutePath).toBe(cwd + '/foo.json');
    expect(paths.dirname).toBe(cwd);
    expect(paths.inputPath).toBe('foo.json');
    expect(paths.extname).toBe('.json');
    expect(paths.basename).toBe('foo.json');
  });
  it('strips trailing slash from everything except inputPath', () => {
    const paths = cli.getPaths('foo/');
    expect(paths.relativePath).toBe('foo');
    expect(paths.absolutePath).toBe(cwd + '/foo');
    expect(paths.dirname).toBe(cwd);
    expect(paths.inputPath).toBe('foo/');
    expect(paths.extname).toBe('');
    expect(paths.basename).toBe('foo');
  });
  it('isUnderCwd', () => {
    expect(cli.getPaths('../foo').isUnderCwd).toBe(false);
    expect(cli.getPaths('.').isUnderCwd).toBe(false);
    expect(cli.getPaths('./foo').isUnderCwd).toBe(true);
    expect(cli.getPaths('foo').isUnderCwd).toBe(true);
  });
});

describe('Cli.getFile', () => {
  let cli: Cli;
  let cwd: string;
  beforeEach(() => {
    cli = new Cli();
    cwd = process.cwd();
  });
  it('calls getPaths', async () => {
    const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('foo');
    const spy = vi.spyOn(cli, 'getPaths');
    const result = await cli.getFile('foo.json');
    expect(result).toBeTruthy();
    expect(spy).toHaveBeenCalledWith('foo.json');
  });
  it('works if stat rejects', async () => {
    const stat: any = { isFile: vi.fn() };
    const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('foo');
    const rfSpy = vi.spyOn(fs, 'readFile').mockResolvedValue('hey' as any);
    const isFileSpy = vi.spyOn(stat, 'isFile').mockReturnValue(true);
    const result = await cli.getFile('foo.json');
    expect(result.exists).toBe(false);
    expect(statSpy).toHaveBeenCalledWith(result.absolutePath);
    expect(rfSpy).not.toHaveBeenCalled();
    expect(isFileSpy).not.toHaveBeenCalled();
    expect(result.isFile).toBe(false);
  });
  it('works if stat resolves', async () => {
    const stat: any = { isFile: vi.fn() };
    const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
    const rfSpy = vi.spyOn(fs, 'readFile').mockResolvedValue('hey' as any);
    const isFileSpy = vi.spyOn(stat, 'isFile').mockReturnValue(true);
    const result = await cli.getFile('foo.json');
    expect(result.exists).toBe(true);
    expect(statSpy).toHaveBeenCalledWith(result.absolutePath);
    expect(isFileSpy).toHaveBeenCalledOnce();
    expect(rfSpy).toHaveBeenCalledWith(result.absolutePath, 'utf-8');
    expect(result.isFile).toBe(true);
    expect(result.contents).toBe('hey');
  });
});

describe('Cli.getDirectory', () => {
  let cli: Cli;
  let cwd: string;
  beforeEach(() => {
    cli = new Cli();
    cwd = process.cwd();
  });
  it('calls getPaths and stat', async () => {
    const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('x');
    const getPathsSpy = vi.spyOn(cli, 'getPaths');
    const result = await cli.getDirectory('foo');
    expect(result).toBeTruthy();
    expect(getPathsSpy).toHaveBeenCalledWith('foo');
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
  });
  it('works if stat rejects (dir does not exist)', async () => {
    const statSpy = vi.spyOn(fs, 'stat').mockRejectedValue('x');
    const readdirSpy = vi.spyOn(fs, 'readdir');
    const result = await cli.getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).not.toHaveBeenCalled();
    expect(result.exists).toBe(false);
    expect(result.isDirectory).toBe(false);
    expect(result.isEmpty).toBe(true);
  });
  it('works if stat resolves (path  exists) but is not a dir', async () => {
    const stat: any = { isDirectory: () => false };
    const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
    const readdirSpy = vi.spyOn(fs, 'readdir');
    const result = await cli.getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).not.toHaveBeenCalled();
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(false);
    expect(result.isEmpty).toBe(true);
  });
  it('works if stat resolves (path  exists) and is a dir', async () => {
    const stat: any = { isDirectory: () => true };
    const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
    const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValue([] as any);
    const result = await cli.getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).toHaveBeenCalled();
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.isEmpty).toBe(true);
  });
  it('works if stat resolves (path  exists) and is a non-empty dir', async () => {
    const stat: any = { isDirectory: () => true };
    const statSpy = vi.spyOn(fs, 'stat').mockResolvedValue(stat);
    const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValue(['a'] as any);
    const result = await cli.getDirectory('foo');

    expect(result).toBeTruthy();
    expect(statSpy).toHaveBeenCalledWith(cwd + '/foo');
    expect(readdirSpy).toHaveBeenCalled();
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.isEmpty).toBe(false);
  });
});


describe('Cli.saveFile', () => {
  let cli: Cli;
  let cwd: string;
  beforeEach(() => {
    cli = new Cli();
    cwd = process.cwd();
  });
  it('works', async () => {
    const ensureSpy = vi.spyOn(fs, 'ensureFile').mockResolvedValue();
    const writeSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    const result = await cli.saveFile('foo.json', 'hey');
    expect(result.absolutePath).toBe(cwd + '/foo.json');
    expect(ensureSpy).toHaveBeenCalledWith(result.absolutePath);
    expect(writeSpy).toHaveBeenCalledWith(result.absolutePath, 'hey');
  });
});

describe('Cli.prettifyAndSaveFile', () => {
  let cli: Cli;
  let cwd: string;
  beforeEach(() => {
    cli = new Cli();
    cwd = process.cwd();
  });
  it('works', async () => {
    const relpath = 'foo.json';
    const paths = cli.getPaths(relpath)
    const getPathsSpy = vi.spyOn(cli, 'getPaths').mockReturnValue(paths)
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(cli, 'saveFile').mockResolvedValue(paths);
    const result = await cli.prettifyAndSaveFile('foo.json', '{}');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath);
    expect(fmtSpy).toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  });
  it('works with extname', async () => {
    const relpath = '.friedarc';
    const paths = cli.getPaths(relpath)
    const getPathsSpy = vi.spyOn(cli, 'getPaths').mockReturnValue(paths)
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(cli, 'saveFile').mockResolvedValue(paths);
    const result = await cli.prettifyAndSaveFile('foo.json', '{}', 'json');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
    expect(fmtSpy).toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  });
  it('works with dotted extname', async () => {
    const relpath = '.friedarc';
    const paths = cli.getPaths(relpath)
    const getPathsSpy = vi.spyOn(cli, 'getPaths').mockReturnValue(paths)
    const configSpy = vi.spyOn(prettier, 'resolveConfig');
    const fmtSpy = vi.spyOn(prettier, 'format');
    const saveSpy = vi.spyOn(cli, 'saveFile').mockResolvedValue(paths);
    const result = await cli.prettifyAndSaveFile('foo.json', '{}', '.json');
    expect(result).toEqual(paths);
    expect(getPathsSpy).toHaveBeenCalledTimes(1);
    expect(configSpy).toHaveBeenCalledWith(paths.absolutePath + '.json');
    expect(fmtSpy).toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  });
});


describe('Cli.readFriedaRc', () => {
 
  let fileResult: FileResult;
  let cli: Cli;

  beforeEach(() => {
    fileResult = {} as FileResult;
    
    cli = new Cli()
    vi.spyOn(cli, 'wait').mockReturnValue({
      succeed: () => {},
      fail: (msg) => {}
    })
  });

  it('is empty object if the file is not a file', async () => {
    fileResult.isFile = false;
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    const { rc, file } = await cli.readFriedaRc();
    expect(readSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is empty object if the json is empty', async () => {
    fileResult.isFile = true;
    fileResult.contents = '';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    const { rc, file } = await cli.readFriedaRc();
    expect(readSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is empty object if the json is bad', async () => {
    fileResult.isFile = true;
    fileResult.contents = 'bad thing';
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    const { rc, file } = await cli.readFriedaRc();
    expect(readSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is empty object if the json is not an obj', async () => {
    fileResult.isFile = true;
    fileResult.contents = JSON.stringify([8,9]);
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);
    const { rc, file } = await cli.readFriedaRc();
    expect(readSpy).toHaveBeenCalled();
    expect(rc).toEqual({});
    expect(file).toEqual(fileResult);
  });
  it('is json if the json is good', async () => {
    fileResult.isFile = true;
    fileResult.contents = JSON.stringify({a: 8});
    const readSpy = vi.spyOn(cli, 'getFile').mockResolvedValue(fileResult);;
    const { rc, file } = await cli.readFriedaRc();
    expect(readSpy).toHaveBeenCalled();
    expect(rc).toEqual({a: 8});
    expect(file).toEqual(fileResult);
  });
});

describe('Cli.saveFriedaRc', () => {
 
  let fileResult: FileResult;
  let cli: Cli;
  beforeEach(() => {
    fileResult = {} as FileResult;
    cli = new Cli()
    vi.spyOn(cli, 'wait').mockReturnValue({
      succeed: () => {},
      fail: (msg) => {}
    })
  });

  it('works', async () => {
    const spy = vi.spyOn(cli, 'prettifyAndSaveFile').mockResolvedValue(fileResult);
    await cli.saveFriedaRc({});
    expect(spy).toHaveBeenCalledWith(FRIEDA_RC_FILE_NAME, JSON.stringify({}), 'json')
  });
  
});

describe('Cli.prompt', () => {
  let cli: Cli;
  beforeEach(async () => {
    
    cli = new Cli();

  });
  it('works', async () => {
    const spy = vi.spyOn(prompts, 'prompt').mockResolvedValue('hey');
    const result = await cli.prompt({
      message: 'What',
      type: 'text',
      name: 'foo'
    });

    expect(result).toBe('hey')
    expect(spy).toHaveBeenCalledWith({
      message: 'What',
      type: 'text',
      name: 'foo'
    }, {onCancel: expect.any(Function)})
  })
})

describe('Cli.wait', () => {
  let cli: Cli;
  beforeEach(() => {
    cli = new Cli();
  });
  it('works', () => {
    const fail = vi.fn();
    const succeed = vi.fn()
    const spy = vi.spyOn(ora, 'default').mockReturnValue({
      start: () => {
        return {
          fail,
          succeed
        }
      }
    } as any);
    const spinner = cli.wait('foo');
    expect(spy).toHaveBeenCalled();
    spinner.fail('foo');
    expect(fail).toHaveBeenCalled();
    spinner.succeed();
    expect(succeed).toHaveBeenCalled();
  })
})