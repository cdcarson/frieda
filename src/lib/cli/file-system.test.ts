import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import {
  readFriedaRc,
  saveFriedaRc,
  writeMigrationFiles,
  writeCurrentSchemaFiles,
  writeGeneratedCode,
  getDirectoryResult,
  getFileResult,
  getFileSystemPaths
} from './file-system.js';
import {dirname} from 'path'
import fs from 'fs-extra';
import prettier from 'prettier';
import type { FullSettings, MigrationData } from './types.js';
import type { DatabaseSchema } from '$lib/api/types.js';
import type { GENERATED_CODE_FILENAMES } from './constants.js';
import { connect } from '@planetscale/database';
const testFullSettings: FullSettings = {
  databaseUrl: '',
  databaseUrlKey: '',
  envFilePath: '',
  generatedCodeDirectory: 'src/db/_generated',
  schemaDirectory: 'schema',
  jsonTypeImports: [],
  typeBigIntAsString: true,
  typeTinyIntOneAsBoolean: true,
  connection: connect({url: 'a'})
};
const testSchema: DatabaseSchema = {
  databaseName: 'foo',
  fetched: new Date(),
  tableNames: ['foo', 'bar'],
  tables: [
    {
      name: 'foo',
      columns: [],
      indexes: [],
      tableCreateStatement: 'CREATE TABLE `foo`'
    },
    {
      name: 'bar',
      columns: [],
      indexes: [],
      tableCreateStatement: 'CREATE TABLE `bar`'
    }
  ]
};
const stat = {
  isFile: vi.fn(),
  isDirectory: vi.fn()
};
vi.mock('fs', async () => {
  const actual: typeof import('fs-extra') = await vi.importActual('fs'); // Step 2.
  return {
    ...actual,
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn()
  };
});
vi.mock('prettier', async () => {
  const actual: typeof import('prettier') = await vi.importActual('prettier'); // Step 2.
  return {
    ...actual,
    resolveConfig: vi.fn(),
    format: vi.fn()
  };
});
describe('readFriedaRc', () => {
  it('settings should be the parsed contents if the file exists and is valid JSON', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any);
    vi.spyOn(stat, 'isFile').mockReturnValue(true);
    vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify({ a: 8 }) as any);
    const result = await readFriedaRc();
    expect(result.settings).toEqual({ a: 8 });
  });
  it('should be the empty object if the file does not exist', async () => {
    vi.spyOn(fs, 'stat').mockRejectedValue(new Error());
    const result = await readFriedaRc();
    expect(result.settings).toEqual({});
  });
  it('should be the empty object if the file exists but contains invalid json', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any);
    vi.spyOn(stat, 'isFile').mockReturnValue(true);
    vi.spyOn(fs, 'readFile').mockResolvedValue('' as any);
    const result = await readFriedaRc();
    expect(result.settings).toEqual({});
  });
  it('should be the empty object if the file exists but the json is not an object', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any);
    vi.spyOn(stat, 'isFile').mockReturnValue(true);
    vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(['a']) as any);
    const result = await readFriedaRc();
    expect(result.settings).toEqual({});
  });
});

describe('writeFriedaRc', () => {
  it('should write the file', async () => {
    const spy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    const result = await saveFriedaRc({ schemaDirectory: 'foo' });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(
      result.paths.absolutePath,
      expect.any(String)
    );
    expect(result.settings).toEqual({ schemaDirectory: 'foo' });
  });

  it('should prettify the results', async () => {
    const prettierSpy = vi.spyOn(prettier, 'format');
    vi.spyOn(fs, 'writeFile').mockResolvedValue();
    await saveFriedaRc({ schemaDirectory: 'foo' });
    expect(prettierSpy).toHaveBeenCalledOnce();
  });
});

describe('writeMigrationFiles', () => {
  let data: MigrationData;
  let date: Date;
  let writeSpy: SpyInstance;
  beforeEach(() => {
    date = new Date();
    data = {
      date,
      migrationSql: 'SELECT',
      schemaAfter: { ...testSchema },
      schemaBefore: { ...testSchema }
    };
    writeSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
  });
  it('should write the files', async () => {
    const results = await writeMigrationFiles(testFullSettings, data);
    expect(writeSpy).toHaveBeenCalledTimes(3);
  });
});

describe('writeCurrentSchemaFiles', () => {
  let writeSpy: SpyInstance;
  let prettifySpy: SpyInstance;
  beforeEach(() => {
    writeSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    prettifySpy = vi.spyOn(prettier, 'format');
  });
  it('should write the files', async () => {
    const results = await writeCurrentSchemaFiles(testFullSettings, testSchema);
    expect(writeSpy).toHaveBeenCalledTimes(2);
    expect(prettifySpy).toHaveBeenCalledTimes(1);
  });
});

describe('writeGeneratedCode', () => {
  let writeSpy: SpyInstance;
  let prettifySpy: SpyInstance;
  let data: {
    [K in keyof typeof GENERATED_CODE_FILENAMES]: string;
  };
  beforeEach(() => {
    writeSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    prettifySpy = vi.spyOn(prettier, 'format');
    data = {
      database: 'export const foo = 8',
      modelDefinitions: 'export const foo = 8',
      schemaCast: 'export const foo = 8',
      types: 'export const foo = 8'
    }
  });
  it('should write the files', async () => {
    const results = await writeGeneratedCode(testFullSettings, data);
    expect(writeSpy).toHaveBeenCalledTimes(4);
    expect(prettifySpy).toHaveBeenCalledTimes(4);
  });
});

describe('getDirectoryResult', () => {
  it('should handle isUnderCwd', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any)
    vi.spyOn(stat, 'isDirectory').mockReturnValue(true);
    vi.spyOn(fs, 'readdir').mockResolvedValue([] as any);
    let result = await getDirectoryResult('../test');
    expect(result.isUnderCwd).toBe(false);
    result = await getDirectoryResult('.');
    expect(result.isUnderCwd).toBe(false);
    result = await getDirectoryResult('.');
    expect(result.isUnderCwd).toBe(false);
    result = await getDirectoryResult('./foo');
    expect(result.isUnderCwd).toBe(true);
    result = await getDirectoryResult('foo');
    expect(result.isUnderCwd).toBe(true);

  })
  it('should handle isEmpty if dir does not exist', async () => {
    vi.spyOn(fs, 'stat').mockRejectedValue(new Error())
    const notCalled = vi.spyOn(fs, 'readdir').mockResolvedValue([] as any);
    let result = await getDirectoryResult('test');
    expect(result.isEmpty).toBe(true);
    expect(notCalled).not.toHaveBeenCalled()

  })
  it('should handle isEmpty if dir does exist', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any)
    vi.spyOn(stat, 'isDirectory').mockReturnValue(true);
    vi.spyOn(fs, 'readdir').mockResolvedValue([] as any);
    let result = await getDirectoryResult('test');
    expect(result.isEmpty).toBe(true);
  })
  it('should handle isEmpty if dir is not empty', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any)
    vi.spyOn(stat, 'isDirectory').mockReturnValue(true);
    vi.spyOn(fs, 'readdir').mockResolvedValue(['bar'] as any);
    let result = await getDirectoryResult('test');
    expect(result.isEmpty).toBe(false);
  });
  it('should call readdir with the right path', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any)
    vi.spyOn(stat, 'isDirectory').mockReturnValue(true);
    const spy = vi.spyOn(fs, 'readdir').mockResolvedValue(['bar'] as any);
    await getDirectoryResult('.');
    expect(spy).toHaveBeenCalledWith(process.cwd());
    await getDirectoryResult('foo');
    expect(spy).toHaveBeenCalledWith(process.cwd() + '/foo');
    await getDirectoryResult('..');
    expect(spy).toHaveBeenCalledWith(dirname(process.cwd()));

  });
})
describe('getFileResult', () => {
  it('reads the file if it is a file', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any)
    vi.spyOn(stat, 'isFile').mockReturnValue(true);
    const spy = vi.spyOn(fs, 'readFile').mockResolvedValue('foo' as any);
    const result = await getFileResult('foo.js');
    expect(result.contents).toEqual('foo')
  })
  it('does not read the file if it is not a file', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue(stat as any)
    vi.spyOn(stat, 'isFile').mockReturnValue(false);
    const spy = vi.spyOn(fs, 'readFile').mockResolvedValue('foo' as any);
    const result = await getFileResult('foo.js');
    expect(result.contents).toEqual(undefined)
  })
});

describe('getFileSystemPaths', () => {
  const cwd = process.cwd();
  it('should handle being passed a rel path that resolves to the current working dir', () => {
    const result = getFileSystemPaths('.');
    expect(result.absolutePath).toBe(cwd)
    expect(result.relativePath).toBe('');
    expect(result.cwd).toBe(cwd)
  });
  it('should handle being passed a rel path that resolves to a dir above current working dir', () => {
    const result = getFileSystemPaths('..');
    expect(result.absolutePath).toBe(dirname(cwd))
    expect(result.relativePath).toBe('..');
    expect(result.cwd).toBe(cwd)
  })
  it('should handle being passed a rel path that resolves to a dir below current working dir', () => {
    const result = getFileSystemPaths('foo');
    expect(result.absolutePath).toBe(cwd + '/foo')
    expect(result.relativePath).toBe('foo');
    expect(result.cwd).toBe(cwd)
  })
  it('what hapens when passed an abs path', () => {
    const result = getFileSystemPaths('/dev/foo');
    expect(result.absolutePath).toBe('/dev/foo');
    expect(result.relativePath).toContain('../dev/foo')
  })
})