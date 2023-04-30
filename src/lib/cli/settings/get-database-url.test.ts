import { describe, it, expect, vi, type SpyInstance, beforeEach } from 'vitest';
import { getDatabaseUrl } from './get-database-url.js';
import type { EnvFileDatabaseUrl } from '../types.js';

import * as readEnvFileDatabaseUrlMod from './read-env-file-database-url.js';
import * as promptMod from './prompt-env-file-path.js';
describe('getDatabaseUrl', () => {
  let readEnvFileDatabaseUrlSpy: SpyInstance;
  let promptSpy: SpyInstance;
  let dbUrl: EnvFileDatabaseUrl;
  beforeEach(() => {
    readEnvFileDatabaseUrlSpy = vi.spyOn(readEnvFileDatabaseUrlMod, 'readEnvFileDatabaseUrl');
    promptSpy = vi.spyOn(promptMod, 'promptEnvFilePath')
    dbUrl = {
      databaseUrl: 'mysql:whatever',
      databaseUrlKey: 'DATABASE_URL',
      envFilePath: '.env'
    } as EnvFileDatabaseUrl;
  });

  it('should succeed if neither the cli arg or setting is present, but .env exists and is valid ',async () => {
    readEnvFileDatabaseUrlSpy.mockResolvedValue(dbUrl);
    const result = await getDatabaseUrl({});
    expect(result).toEqual(dbUrl);
    expect(readEnvFileDatabaseUrlSpy).toHaveBeenCalledWith('.env')
    expect(promptSpy).not.toHaveBeenCalled();
  })
  it('should succeed if neither the cli arg or setting is present, but .env exists and is invalid ',async () => {
    readEnvFileDatabaseUrlSpy.mockRejectedValue(new Error());
    promptSpy.mockResolvedValue(dbUrl)
    const result = await getDatabaseUrl({});
    expect(result).toEqual(dbUrl);
    expect(readEnvFileDatabaseUrlSpy).toHaveBeenCalledWith('.env')
    expect(promptSpy).toHaveBeenCalled();
  })
  it('should succeed if the cli arg is present and is valid ',async () => {
    readEnvFileDatabaseUrlSpy.mockResolvedValue(dbUrl);
    const result = await getDatabaseUrl({cli: '.xyz'});
    expect(readEnvFileDatabaseUrlSpy).toHaveBeenCalledWith('.xyz')
    expect(readEnvFileDatabaseUrlSpy).not.toHaveBeenCalledWith('.env')
    expect(promptSpy).not.toHaveBeenCalled();
  })
  it('should succeed if the rc setting is present and is valid ',async () => {
    readEnvFileDatabaseUrlSpy.mockResolvedValue(dbUrl);
    const result = await getDatabaseUrl({rc: '.rc'});
    expect(readEnvFileDatabaseUrlSpy).toHaveBeenCalledWith('.rc')
    expect(readEnvFileDatabaseUrlSpy).not.toHaveBeenCalledWith('.env')
    expect(promptSpy).not.toHaveBeenCalled();
  })

  
})