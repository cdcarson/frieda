import colors from 'picocolors';
import prettier from 'prettier';
import { join, relative } from 'path';
export const formatFilePath = (p: string): string => {
  return colors.underline(colors.cyan(relative(process.cwd(), p)));
};

export const getRcFilePath = (): string => {
  return join(process.cwd(), '.friedarc');
};

export const getGeneratedModelsDirectoryFullPath = (generatedModelsDirectory: string) => {
  return join(process.cwd(), generatedModelsDirectory);
};


export const getMigrationsDirectoryFullPath = (migrationsDirectory: string) => {
  return join(process.cwd(), migrationsDirectory);
};



export const getCurrentMigrationsFilePath = (migrationsDirectory: string) => {
  return join(
    getMigrationsDirectoryFullPath(migrationsDirectory),
    'current-migration.sql'
  );
};

export const getCurrentSchemaFilePath = (migrationsDirectory: string) => {
  return join(
    getMigrationsDirectoryFullPath(migrationsDirectory),
    'current-schema.sql'
  );
};


export const validateNotEmpty = (value: string) => {
  if (value.trim().length === 0) {
    return 'Required.';
  }
};
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const replaceDatabaseURLPassword = (urlStr: string): string => {
  const url = new URL(urlStr);
  const savedProtocol = url.protocol;
  url.protocol = 'http:';
  url.password = '<PASSWORD>';
  url.protocol = savedProtocol;
  return url.href.replace('%3CPASSWORD%3E', '<PASSWORD>');
};


export const prettify = async (contents: string, filePath: string): Promise<string> => {
  const config = await prettier.resolveConfig(filePath, {});
  return prettier.format(contents, config || {})
}

