import { prettifyAndSaveFile } from '$lib/fs/prettify-and-save-file.js';
import { saveFile } from '$lib/fs/save-file.js';
import type { FsPaths } from '$lib/fs/types.js';
import type { JavascriptCode, TypescriptCode } from './types.js';
import { join, extname } from 'node:path';

export const writeFiles = async (
  out: JavascriptCode | TypescriptCode,
  ouputDirectory: string
): Promise<FsPaths[]> => {
  return Promise.all(
    Object.keys(out).map((k) => {
      const fileName = k as keyof (JavascriptCode | TypescriptCode) & string;
      const path = join(ouputDirectory, fileName);
      return extname(fileName).includes('map')
        ? saveFile(path, out[fileName])
        : prettifyAndSaveFile(path, out[fileName]);
    })
  );
};
