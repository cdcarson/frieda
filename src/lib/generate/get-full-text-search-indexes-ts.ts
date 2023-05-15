import type { FetchedSchema } from '$lib/fetch/types.js';
import { getFullTextSearchIndexes } from '$lib/parse/model-parsers.js';
import type { FullTextSearchIndex } from '../api/types.js';

export const getFullTextSearchIndexesTs = (
  fetched: FetchedSchema,
  bannerComment: string
): string => {
  type IMap = { [key: string]: FullTextSearchIndex };
  const indexes: FullTextSearchIndex[] = fetched.tables.flatMap((t) =>
    getFullTextSearchIndexes(t)
  );
  const map: IMap = indexes.reduce((acc: IMap, index: FullTextSearchIndex) => {
    const copy = { ...acc };
    copy[index.key] = index;
    return copy;
  }, {} as IMap);
  return `
    ${bannerComment}
    import type {FullTextSearchIndex} from '@nowzoo/frieda';
    
    const map: {[key: string]: FullTextSearchIndex} = ${JSON.stringify(map)}

    export default map;
  `;
};
