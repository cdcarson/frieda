import type { FetchedSchema } from '$lib/fetch/types.js';
import { getModelName } from '../parse/model-parsers.js';
import { getModelTypeDeclarations } from './get-model-type-declarations.js';

export const getTypesTs = (
  schema: FetchedSchema,
  bannerComment: string
): string => {
  return `
    ${bannerComment}
    import type {ModelDb} from '@nowzoo/frieda';
   

    ${schema.tables
      .map((t) => {
        const types = getModelTypeDeclarations(t);
        const modelName = getModelName(t);
        return `
        /**
         * Types for the ${modelName} model.
         */
        ${types.model}
        ${types.selectAll}
        ${types.primaryKey}
        ${types.createData}
        ${types.updateData}
        ${types.findUniqueParams}
        ${types.db}
      `;
      })
      .join('\n\n')}

  `;
};
