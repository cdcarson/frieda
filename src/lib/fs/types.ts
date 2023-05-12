export type FsPaths = {
  inputPath: string;
  cwd: string;
  absolutePath: string;
  relativePath: string;
  dirname: string;
  basename: string;
  extname: string;
  isUnderCwd: boolean;
};

export type FileResult = FsPaths & {
  exists: boolean;
  isFile: boolean;
  contents?: string;
};

export type DirectoryResult = FsPaths & {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean;
};
