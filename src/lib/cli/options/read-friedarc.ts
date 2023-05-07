import { FRIEDA_RC_FILE_NAME } from '../constants.js';
import { getFile } from '../fs/get-file.js';
import type { FileResult, Options } from '../types.js';
import { isPlainObject } from '../utils/is-plain-object.js';

export const readFriedarc = async (): Promise<{
  file: FileResult;
  rc: Partial<Options>;
}> => {
  const file = await getFile(FRIEDA_RC_FILE_NAME);
  let rc: Partial<Options> = {};
  if (file.isFile) {
    try {
      rc = JSON.parse(file.contents || '');
      rc = isPlainObject(rc) ? rc : {};
    } catch (error) {
      rc = {};
    }
  }
  return {
    file,
    rc
  };
};
