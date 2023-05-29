import { describe, it, expect, vi, beforeEach, type SpyInstance } from 'vitest';
import { Options } from './options.js';
import { FileSystem } from './file-system.js';
import type {
  BuildOptions,
  DatabaseDetails,
  DirectoryResult,
  FileResult,
  PathResult
} from './types.js';
import { ENV_DB_URL_KEYS, FRIEDA_RC_FILE_NAME } from './constants.js';
import prompts from 'prompts';
describe('Options', () => {
  let fs: FileSystem;
  let testCwd: string;
  beforeEach(() => {
    testCwd = '/a/b';
    fs = new FileSystem(testCwd);
  });
  describe('parsing the cli args', () => {
    it('help', () => {
      expect(new Options(fs, ['-h']).help).toBe(true);
      expect(new Options(fs, ['--help']).help).toBe(true);
      expect(new Options(fs, []).help).toBe(false);
    });
    it('init', () => {
      expect(new Options(fs, ['-i']).init).toBe(true);
      expect(new Options(fs, ['--init']).init).toBe(true);
      expect(new Options(fs, []).init).toBe(false);
    });
    it('explore', () => {
      expect(new Options(fs, ['-x']).explore).toBe(true);
      expect(new Options(fs, ['--explore']).explore).toBe(true);
      expect(new Options(fs, []).explore).toBe(false);
    });
    it('model', () => {
      expect(new Options(fs, ['-m', 'foo']).model).toBe('foo');
      expect(new Options(fs, ['--model', 'foo']).model).toBe('foo');
      expect(new Options(fs, []).model).toBe('');
    });
    it('field', () => {
      expect(new Options(fs, ['-f', 'foo']).field).toBe('foo');
      expect(new Options(fs, ['--field', 'foo']).field).toBe('foo');
      expect(new Options(fs, []).field).toBe('');
    });

    it('showHelp', () => {
      const opts = new Options(fs, ['-f', 'foo']);
      opts.showHelp();
    });
  });

  describe('build options', () => {
    let buildOptions: BuildOptions;
    let opts: Options;
    beforeEach(() => {
      buildOptions = {
        compileJs: false,
        envFile: '.env',
        outputDirectory: 'src/db/_g',
        schemaDirectory: 'schema'
      };
      opts = new Options(fs, []);
      vi.spyOn(opts, 'readRc').mockResolvedValue({
        rcOptions: buildOptions,
        rcFile: {} as FileResult
      });
      vi.spyOn(opts, 'validateDirectory').mockImplementation(async (key, v) => {
        return {
          ...fs.getPathResult(v),
          isDirectory: true,
          isEmpty: true,
          exists: false
        };
      });
      vi.spyOn(opts, 'validateEnvFile').mockImplementation(async (v) => {
        return {
          databaseUrl: 'mysql://u:p@h',
          databaseUrlKey: 'DATABASE_URL',
          envFile: v
        };
      });
    });
    it('throw if not initialized', async () => {
      expect(() => opts.compileJs).toThrow();
      expect(() => opts.outputDirectory).toThrow();
      expect(() => opts.schemaDirectory).toThrow();
      expect(() => opts.envFile).toThrow();
      expect(() => opts.databaseDetails).toThrow();
    });
    it('does not throw if initialized', async () => {
      await opts.initialize();
      expect(opts.compileJs).toBe(false);
      expect(opts.schemaDirectory).toBe('schema');
      expect(opts.outputDirectory).toBe('src/db/_g');
      expect(opts.envFile).toBe('.env');
      expect(opts.databaseDetails).toEqual({
        databaseUrl: 'mysql://u:p@h',
        databaseUrlKey: 'DATABASE_URL',
        envFile: '.env'
      });
    });
  });

  describe('readRc', () => {
    let readSpy: SpyInstance;
    let pathResult: PathResult;
    beforeEach(() => {
      pathResult = fs.getPathResult(FRIEDA_RC_FILE_NAME);
      readSpy = vi.spyOn(fs, 'getFileResult');
    });
    it('works', async () => {
      readSpy.mockResolvedValue({
        ...pathResult,
        exists: true,
        isFile: true,
        contents: JSON.stringify({})
      });
      const opts = new Options(fs, []);
      const result = await opts.readRc();
      expect(result.rcOptions).toEqual({});
    });
    it('works if the file has bad json', async () => {
      readSpy.mockResolvedValue({
        ...pathResult,
        exists: true,
        isFile: true,
        contents: 'yucj'
      });
      const opts = new Options(fs, []);
      const result = await opts.readRc();
      expect(result.rcOptions).toEqual({});
    });
    it('works if the file is empty', async () => {
      readSpy.mockResolvedValue({
        ...pathResult,
        exists: true,
        isFile: true,
        contents: ''
      });
      const opts = new Options(fs, []);
      const result = await opts.readRc();
      expect(result.rcOptions).toEqual({});
    });
    it('works if the json is not an obj', async () => {
      readSpy.mockResolvedValue({
        ...pathResult,
        exists: true,
        isFile: true,
        contents: JSON.stringify([])
      });
      const opts = new Options(fs, []);
      const result = await opts.readRc();
      expect(result.rcOptions).toEqual({});
    });
  });

  describe('validateDirectory', () => {
    let dirSpy: SpyInstance;
    let directoryResult: DirectoryResult;
    beforeEach(() => {
      directoryResult = {
        ...fs.getPathResult('s/r'),
        isDirectory: true,
        isEmpty: true,
        exists: false
      };
      dirSpy = vi.spyOn(fs, 'getDirectory');
    });
    it('works', async () => {
      dirSpy.mockResolvedValue(directoryResult);
      const opts = new Options(fs, []);
      const r = await opts.validateDirectory('outputDirectory', 's/r');
      expect(r).toEqual(directoryResult);
    });
    it('should throw if not in cwd', async () => {
      directoryResult.isUnderCwd = false;
      dirSpy.mockResolvedValue(directoryResult);
      const opts = new Options(fs, []);
      await expect(() =>
        opts.validateDirectory('outputDirectory', 's/r')
      ).rejects.toThrow();
    });
    it('should throw if not a dir', async () => {
      directoryResult.isDirectory = false;
      directoryResult.exists = true;
      dirSpy.mockResolvedValue(directoryResult);
      const opts = new Options(fs, []);
      await expect(() =>
        opts.validateDirectory('outputDirectory', 's/r')
      ).rejects.toThrow();
    });
  });
  describe('promptDirectory', () => {
    let directoryResult: DirectoryResult;
    beforeEach(() => {
      directoryResult = {
        ...fs.getPathResult('x/y'),
        isDirectory: true,
        isEmpty: true,
        exists: true
      };
    });
    it('should resolve', async () => {
      prompts.inject(['x/y']);
      const opts = new Options(fs, []);
      vi.spyOn(opts, 'validateDirectory').mockResolvedValue(directoryResult);
      const res = await opts.promptDirectory('outputDirectory');
      expect(res).toEqual(directoryResult);
    });
    it('should resolve if the first one is invalid', async () => {
      prompts.inject(['x/y']);
      const opts = new Options(fs, []);
      const spy = vi
        .spyOn(opts, 'validateDirectory')
        .mockResolvedValue(directoryResult);
      spy.mockRejectedValueOnce(new Error('foo'));
      const res = await opts.promptDirectory('outputDirectory');
      expect(res).toEqual(directoryResult);
    });

    it('should resolve if the dir is not empty', async () => {
      directoryResult.isEmpty = false;
      directoryResult.isDirectory = true;
      prompts.inject(['x/y', true]);
      const opts = new Options(fs, []);
      vi.spyOn(opts, 'validateDirectory').mockResolvedValue(directoryResult);
      const res = await opts.promptDirectory('outputDirectory');
      expect(res).toEqual(directoryResult);
    });
    it('should resolve if the dir is not empty and the user selects a diff path', async () => {
      directoryResult.isEmpty = false;
      directoryResult.isDirectory = true;

      prompts.inject(['n/o', false, 'x/y', true]);
      const opts = new Options(fs, []);
      vi.spyOn(opts, 'validateDirectory').mockResolvedValue(directoryResult);
      const res = await opts.promptDirectory('outputDirectory');
      expect(res).toEqual(directoryResult);
    });
  });

  describe('validateEnvFile', () => {
    let fileResult: FileResult;
    let readSpy: SpyInstance;
    beforeEach(() => {
      fileResult = {
        ...fs.getPathResult('.env'),
        isFile: true,
        exists: true,
        contents: `DATABASE_URL=mysql://u:p@host`
      };
      readSpy = vi.spyOn(fs, 'getFileResult');
    });
    it('works with a valid env file', async () => {
      readSpy.mockResolvedValue(fileResult);
      const opts = new Options(fs, []);
      const r = await opts.validateEnvFile('.env');
      expect(r).toEqual({
        databaseUrl: 'mysql://u:p@host',
        databaseUrlKey: 'DATABASE_URL',
        envFile: '.env'
      });
    });
    it('should throw if not a file', async () => {
      fileResult.isFile = false;
      readSpy.mockResolvedValue(fileResult);
      const opts = new Options(fs, []);
      await expect(() => opts.validateEnvFile('.env')).rejects.toThrow();
    });
    it('should throw if does not exist', async () => {
      fileResult.exists = false;
      readSpy.mockResolvedValue(fileResult);
      const opts = new Options(fs, []);
      await expect(() => opts.validateEnvFile('.env')).rejects.toThrow();
    });
    it('should throw if no db url key found', async () => {
      fileResult.contents = '';
      readSpy.mockResolvedValue(fileResult);
      const opts = new Options(fs, []);
      await expect(() => opts.validateEnvFile('.env')).rejects.toThrow();
    });
    it('should throw if url key found, but empty', async () => {
      fileResult.contents = 'DATABASE_URL=';
      readSpy.mockResolvedValue(fileResult);
      const opts = new Options(fs, []);
      await expect(() => opts.validateEnvFile('.env')).rejects.toThrow();
    });
    it('should throw if url key found, but invalid', async () => {
      fileResult.contents = 'DATABASE_URL=ccsfc';
      readSpy.mockResolvedValue(fileResult);
      const opts = new Options(fs, []);
      await expect(() => opts.validateEnvFile('.env')).rejects.toThrow();
    });
  });

  describe('validateDatabaseUrl', () => {
    it('works', () => {
      const opts = new Options(fs, []);
      expect(opts.validateDatabaseUrl('')).toBe(false);
      expect(opts.validateDatabaseUrl(undefined)).toBe(false);
      expect(opts.validateDatabaseUrl('a://u:p@host')).toBe(true);
      expect(opts.validateDatabaseUrl('a://@host')).toBe(false);
      expect(opts.validateDatabaseUrl('a://u@host')).toBe(false);
      expect(opts.validateDatabaseUrl('a://u:@host')).toBe(false);
      expect(opts.validateDatabaseUrl('a://:p@host')).toBe(false);
    });
  });

  describe('promptEnvFile', () => {
    let dbDetails: DatabaseDetails;
    beforeEach(() => {
      dbDetails = {
        databaseUrl: '',
        databaseUrlKey: '',
        envFile: ''
      };
    });
    it('should resolve', async () => {
      prompts.inject(['.env']);
      const opts = new Options(fs, []);
      vi.spyOn(opts, 'validateEnvFile').mockResolvedValue(dbDetails);
      const res = await opts.promptEnvFile();
      expect(res).toEqual(dbDetails);
    });
    it('should resolve if the first one is invalid', async () => {
      prompts.inject(['.env']);
      const opts = new Options(fs, []);
      const spy = vi
        .spyOn(opts, 'validateEnvFile')
        .mockResolvedValue(dbDetails);
      spy.mockRejectedValueOnce(new Error('foo'));
      const res = await opts.promptEnvFile();
      expect(res).toEqual(dbDetails);
    });

    // it('should resolve if the dir is not empty', async () => {
    //   fileResult.isEmpty = false;
    //   fileResult.isDirectory = true
    //   prompts.inject(['x/y', true]);
    //   const opts = new Options(fs, []);
    //   vi.spyOn(opts, 'validateDirectory').mockResolvedValue(fileResult);
    //   const res = await opts.promptDirectory('outputDirectory');
    //   expect(res).toEqual(fileResult)
    // });
    // it('should resolve if the dir is not empty and the user selects a diff path', async () => {
    //   fileResult.isEmpty = false;
    //   fileResult.isDirectory = true;

    //   prompts.inject(['n/o', false, 'x/y', true]);
    //   const opts = new Options(fs, []);
    //   vi.spyOn(opts, 'validateDirectory').mockResolvedValue(fileResult);
    //   const res = await opts.promptDirectory('outputDirectory');
    //   expect(res).toEqual(fileResult)
    // })
  });
  describe('initialize', () => {
    it('should work if the rc file has valid opts', async () => {
      const buildOpts: BuildOptions = {
        compileJs: true,
        envFile: '.env',
        outputDirectory: 'src/__gen',
        schemaDirectory: 'schema'
      };
      const pathResult = fs.getPathResult(FRIEDA_RC_FILE_NAME);

      const opts = new Options(fs, []);
      vi.spyOn(opts, 'readRc').mockResolvedValue({
        rcFile: {
          ...pathResult,
          exists: true,
          isFile: true,
          contents: JSON.stringify(buildOpts)
        },
        rcOptions: buildOpts
      });
      vi.spyOn(opts, 'validateDirectory').mockImplementation(
        async (key, relPath) => {
          return {
            ...fs.getPathResult(relPath),
            isDirectory: true,
            isEmpty: false,
            exists: true
          };
        }
      );
      vi.spyOn(opts, 'validateEnvFile').mockImplementation(async (relPath) => {
        return {
          databaseUrlKey: ENV_DB_URL_KEYS[0],
          databaseUrl: 'mysql://u:p@host',
          envFile: relPath
        };
      });
      await opts.initialize();
      expect(opts.compileJs).toEqual(buildOpts.compileJs);
    });
    it('should work if errors in the cli args', async () => {
      const opts = new Options(fs, [
        '-o',
        'error',
        '-e',
        'error',
        '-s',
        'error'
      ]);

      const pathResult = fs.getPathResult(FRIEDA_RC_FILE_NAME);

      vi.spyOn(opts, 'readRc').mockResolvedValue({
        rcFile: {
          ...pathResult,
          exists: true,
          isFile: true,
          contents: JSON.stringify({})
        },
        rcOptions: {}
      });

      vi.spyOn(opts, 'validateEnvFile').mockRejectedValue(new Error());
      vi.spyOn(opts, 'validateDirectory').mockRejectedValue(new Error());
      vi.spyOn(opts, 'promptDirectory').mockResolvedValue({
        relativePath: 'a'
      } as unknown as DirectoryResult);
      vi.spyOn(opts, 'promptEnvFile').mockResolvedValue({
        databaseUrl: 'mysql://u:p@h',
        databaseUrlKey: 'a',
        envFile: '.env'
      });
      vi.spyOn(fs, 'prettifyAndSaveFile').mockResolvedValue({} as PathResult);
      await opts.initialize();
      expect(opts.databaseDetails.databaseUrl).toEqual('mysql://u:p@h');
    });
    it('should work if init is true', async () => {
      const opts = new Options(fs, ['-i']);
      const buildOpts: BuildOptions = {
        compileJs: true,
        envFile: '.env',
        outputDirectory: 'src/__gen',
        schemaDirectory: 'schema'
      };
      const pathResult = fs.getPathResult(FRIEDA_RC_FILE_NAME);

      vi.spyOn(opts, 'readRc').mockResolvedValue({
        rcFile: {
          ...pathResult,
          exists: true,
          isFile: true,
          contents: JSON.stringify(buildOpts)
        },
        rcOptions: buildOpts
      });

      vi.spyOn(opts, 'validateEnvFile').mockResolvedValue({
        databaseUrl: 'mysql://u:p@h',
        databaseUrlKey: 'a',
        envFile: '.env'
      });
      vi.spyOn(opts, 'validateDirectory').mockResolvedValue({
        relativePath: 'a'
      } as unknown as DirectoryResult);
      vi.spyOn(opts, 'promptDirectory').mockResolvedValue({
        relativePath: 'a'
      } as unknown as DirectoryResult);
      vi.spyOn(opts, 'promptEnvFile').mockResolvedValue({
        databaseUrl: 'mysql://u:p@h',
        databaseUrlKey: 'a',
        envFile: '.env'
      });
      vi.spyOn(fs, 'prettifyAndSaveFile').mockResolvedValue({} as PathResult);
      await opts.initialize();
    });
    it('should work if init is true and empty rc opts', async () => {
      const opts = new Options(fs, ['-i']);
      const buildOpts: BuildOptions = {
        compileJs: true,
        envFile: '.env',
        outputDirectory: 'src/__gen',
        schemaDirectory: 'schema'
      };
      const pathResult = fs.getPathResult(FRIEDA_RC_FILE_NAME);

      vi.spyOn(opts, 'readRc').mockResolvedValue({
        rcFile: {
          ...pathResult,
          exists: true,
          isFile: true,
          contents: JSON.stringify(buildOpts)
        },
        rcOptions: {}
      });

      vi.spyOn(opts, 'validateEnvFile').mockResolvedValue({
        databaseUrl: 'mysql://u:p@h',
        databaseUrlKey: 'a',
        envFile: '.env'
      });
      vi.spyOn(opts, 'validateDirectory').mockResolvedValue({
        relativePath: 'a'
      } as unknown as DirectoryResult);
      vi.spyOn(opts, 'promptDirectory').mockResolvedValue({
        relativePath: 'a'
      } as unknown as DirectoryResult);
      vi.spyOn(opts, 'promptEnvFile').mockResolvedValue({
        databaseUrl: 'mysql://u:p@h',
        databaseUrlKey: 'a',
        envFile: '.env'
      });
      vi.spyOn(fs, 'prettifyAndSaveFile').mockResolvedValue({} as PathResult);
      await opts.initialize();
    });
    it('should work if the compileJs is passed in the cli args', async () => {
      const buildOpts: BuildOptions = {
        compileJs: false,
        envFile: '.env',
        outputDirectory: 'src/__gen',
        schemaDirectory: 'schema'
      };
      const pathResult = fs.getPathResult(FRIEDA_RC_FILE_NAME);

      const opts = new Options(fs, ['-j']);
      vi.spyOn(opts, 'readRc').mockResolvedValue({
        rcFile: {
          ...pathResult,
          exists: true,
          isFile: true,
          contents: JSON.stringify(buildOpts)
        },
        rcOptions: buildOpts
      });
      vi.spyOn(opts, 'validateDirectory').mockImplementation(
        async (key, relPath) => {
          return {
            ...fs.getPathResult(relPath),
            isDirectory: true,
            isEmpty: false,
            exists: true
          };
        }
      );
      vi.spyOn(opts, 'validateEnvFile').mockImplementation(async (relPath) => {
        return {
          databaseUrlKey: ENV_DB_URL_KEYS[0],
          databaseUrl: 'mysql://u:p@host',
          envFile: relPath
        };
      });
      prompts.inject([false]);
      await opts.initialize();
      expect(opts.compileJs).toEqual(true);
    });
    it('should save the rc file', async () => {
      const buildOpts: BuildOptions = {
        compileJs: false,
        envFile: '.env',
        outputDirectory: 'src/__gen',
        schemaDirectory: 'schema'
      };
      const pathResult = fs.getPathResult(FRIEDA_RC_FILE_NAME);

      const opts = new Options(fs, ['-j']);
      vi.spyOn(opts, 'readRc').mockResolvedValue({
        rcFile: {
          ...pathResult,
          exists: true,
          isFile: true,
          contents: JSON.stringify(buildOpts)
        },
        rcOptions: buildOpts
      });
      vi.spyOn(opts, 'validateDirectory').mockImplementation(
        async (key, relPath) => {
          return {
            ...fs.getPathResult(relPath),
            isDirectory: true,
            isEmpty: false,
            exists: true
          };
        }
      );
      vi.spyOn(opts, 'validateEnvFile').mockImplementation(async (relPath) => {
        return {
          databaseUrlKey: ENV_DB_URL_KEYS[0],
          databaseUrl: 'mysql://u:p@host',
          envFile: relPath
        };
      });
      vi.spyOn(fs, 'prettifyAndSaveFile').mockResolvedValue({} as PathResult);
      prompts.inject([true]);
      await opts.initialize();
      expect(opts.compileJs).toEqual(true);
    });
  });
});
