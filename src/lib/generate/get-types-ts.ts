import type { FetchedSchema } from '$lib/fetch/types.js';
import type { TypeOptions } from '../api/types.js';
import { getModelName } from '../parse/model-parsers.js';
import { getModelTypeDeclarations } from './get-model-type-declarations.js';

export const getTypesTs = (
  schema: FetchedSchema,
  typeOptions: TypeOptions,
  bannerComment: string
): string => {
  return `
    ${bannerComment}
    import type {ModelDb} from '@nowzoo/frieda';
    ${typeOptions.typeImports.join('\n')}

    ${schema.tables
      .map((t) => {
        const types = getModelTypeDeclarations(t, typeOptions);
        const modelName = getModelName(t);
        return `
        /**
         * Types for the ${modelName} model.
         */
        ${types.model}
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
