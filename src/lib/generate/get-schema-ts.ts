import type { FieldDefinition, ModelDefinition, Schema } from '../api/types.js';
import type { ExtendedSchema } from '../parse/types.js';

export const getSchemaTs = (
  extendedSchema: ExtendedSchema,
  bannerComment: string
): string => {
  const schema: Schema = {
    databaseName: extendedSchema.databaseName,
    cast: extendedSchema.cast,
    models: extendedSchema.models.map((exm) => {
      const model: ModelDefinition = {
        tableName: exm.tableName,
        modelName: exm.modelName,
        fields: exm.fields.map((exf) => {
          const field: FieldDefinition = {
            autoIncrement: exf.autoIncrement,
            castType: exf.castType,
            columnName: exf.columnName,
            fieldName: exf.fieldName,
            generatedAlways: exf.generatedAlways,
            hasDefault: exf.hasDefault,
            invisible: exf.invisible,
            javascriptType: exf.javascriptType,
            mysqlBaseType: exf.mysqlBaseType,
            mysqlFullType: exf.mysqlFullType,
            nullable: exf.nullable,
            primaryKey: exf.primaryKey,
            unique: exf.unique
          };
          return field;
        })
      };
      return model;
    })
  };
  return `
    ${bannerComment}
    import type {Schema} from '@nowzoo/frieda';
    
    const schema: Schema = ${JSON.stringify(schema)}

    export default schema;
  `;
};
