import type { ExtendedSchema } from '../parse/types.js';

export const getTypesTs = (
  schema: ExtendedSchema,
  bannerComment: string
): string => {
  return `
    ${bannerComment}
    import type {ModelDb} from '@nowzoo/frieda';
    ${(schema.typeOptions.typeImports || []).join('\n')}

    ${schema.models
      .map((m) => {
        return `
        /**
         * Types for the ${m.modelName} model.
         */
        ${m.modelTypeDeclaration}
        ${m.omittedBySelectAllTypeDeclaration}
        ${m.primaryKeyTypeDeclaration}
        ${m.createDataTypeDeclaration}
        ${m.updateDataTypeDeclaration}
        ${m.findUniqueParamsTypeDeclaration}
        ${m.dbTypeDeclaration}
      `;
      })
      .join('\n\n')}

  `;
};
