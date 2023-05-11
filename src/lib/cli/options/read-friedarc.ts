import { FRIEDA_RC_FILE_NAME } from '../constants.js';
import { getFile } from '../../fs/get-file.js';
import type { ResolvedCliOptions } from '../types.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { FileResult } from '../../fs/types.js';

export const readFriedarc = async (): Promise<{
  file: FileResult;
  rc: Partial<ResolvedCliOptions>;
}> => {
  const file = await getFile(FRIEDA_RC_FILE_NAME);
  let rc: Partial<ResolvedCliOptions> = {};
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
