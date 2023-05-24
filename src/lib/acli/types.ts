export type Options = {
  envFile: string;
  outputDirectory: string;
  schemaDirectory: string;
  compileJs: boolean;
}

export type CliOptions = Partial<Options> & {
  explore?: boolean;
  model?: string;
  field?: string;
  init?: boolean;
  help?: boolean
}

export type FsPathInfo = {
  inputPath: string;
  cwd: string;
  absolutePath: string;
  relativePath: string;
  dirname: string;
  basename: string;
  extname: string;
  isUnderCwd: boolean;
};

export type FileResult = FsPathInfo & {
  exists: boolean;
  isFile: boolean;
  contents?: string;
};

export type DirectoryResult = FsPathInfo & {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean;
};
