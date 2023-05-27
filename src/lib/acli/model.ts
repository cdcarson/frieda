import camelcase from 'camelcase';
import type { FetchedTable, IModel, Index } from './types.js';
import { Field } from './field.js';

export class Model implements IModel {
  #table: FetchedTable;
  #fields: Field[];
  #indexes: Index[];
  constructor(table: FetchedTable) {
    this.#table = table;
    this.#fields = table.columns.map((c) => new Field(c));
    this.#indexes = Array.from(
      new Set(table.indexes.map((i) => i.Key_name))
    ).map((key) => {
      const rows = table.indexes.filter((i) => i.Key_name === key);
      const index: Index = {
        indexName: key,
        columnNames: rows.map((r) => r.Column_name) as string[],
        indexRows: rows,
        isUnique: rows[0].Non_unique === 0,
        isPrimary: key === 'PRIMARY',
        isFullTextSearch: rows[0].Index_type === 'FULLTEXT',
        type: rows[0].Index_type
      };
      return index;
    });
  }

  get table(): FetchedTable {
    return this.#table;
  }

  get indexes(): Index[] {
    return this.#indexes;
  }

  get tableName(): string {
    return this.table.name;
  }

  get modelName(): string {
    return camelcase(this.tableName, { pascalCase: true });
  }
  get fields(): Field[] {
    return this.#fields;
  }

  get selectAllTypeName(): string {
    return `${this.modelName}SelectAll`;
  }
  get primaryKeyTypeName(): string {
    return `${this.modelName}PrimaryKey`;
  }
  get createTypeName(): string {
    return `${this.modelName}Create`;
  }
  get updateTypeName(): string {
    return `${this.modelName}Update`;
  }
  get findUniqueTypeName(): string {
    return `${this.modelName}FindUnique`;
  }
  get dbTypeName(): string {
    return `${this.modelName}Db`;
  }

  get appDbKey(): string {
    return camelcase(this.tableName);
  }

  get findUniqueTypes(): string[] {
    return this.indexes
      .filter((i) => i.isUnique && !i.isPrimary)
      .map((i) => {
        const fieldSignatures = i.columnNames.map((columnName) => {
          const f = this.fields.find(
            (f) => f.columnName === columnName
          ) as Field;
          return `${f.fieldName}:${f.javascriptType}`;
        });
        // tests depend on maintaining this spacing
        return `{${fieldSignatures.join(';')}}`;
      });
  }

  /**
   * The model's base type.
   * Fields are optional if the column is INVISIBLE.
   */
  get modelTypeDeclaration(): string {
    // tests depend on spacing
    const sigs = this.fields.map((f) => {
      const opt = f.isInvisible ? '?' : '';
      const orNull = f.isNullable ? '|null' : '';
      return `${f.fieldName}${opt}:${f.javascriptType}${orNull}`;
    });
    return `export type ${this.modelName}={${sigs.join(';')}}`;
  }

  /**
   * The model's select all type.
   * Fields are omitted if the column is INVISIBLE.
   */
  get selectAllTypeDeclaration(): string {
    // tests depend on spacing
    const sigs = this.fields
      .filter((f) => !f.isInvisible)
      .map((f) => {
        const orNull = f.isNullable ? '|null' : '';
        return `${f.fieldName}:${f.javascriptType}${orNull}`;
      });
    return `export type ${this.selectAllTypeName}={${sigs.join(';')}}`;
  }
  get primaryKeyTypeDeclaration(): string {
    // tests depend on spacing
    const sigs = this.fields
      .filter((f) => f.isPrimaryKey)
      .map((f) => {
        return `${f.fieldName}:${f.javascriptType}`;
      });
    return `export type ${this.primaryKeyTypeName}={${sigs.join(';')}}`;
  }

   /**
   * The model's create type.
   * Fields are omitted if the column is GENERATED.
   * Fields are optional if the column is auto_increment or has a default value.
   */
  get createTypeDeclaration(): string {
    // tests depend on spacing
    const sigs = this.fields
      .filter(f => !f.isGeneratedAlways)
      .map((f) => {
        const opt = f.isAutoIncrement || f.hasDefault ? '?' : '';
        const orNull = f.isNullable ? '|null' : '';
        return `${f.fieldName}${opt}:${f.javascriptType}${orNull}`;
      })
    return `export type ${this.createTypeName}={${sigs.join(';')}}`;
  }
   /**
   * The model's update type.
   * Fields omitted if the column is GENERATED or a primary key.
   */
  get updateTypeDeclaration(): string {
    // tests depend on spacing
    const sigs = this.fields
      .filter(f => !f.isGeneratedAlways && !f.isPrimaryKey)
      .map((f) => {
        const orNull = f.isNullable ? '|null' : '';
        return `${f.fieldName}?:${f.javascriptType}${orNull}`;
      })
    return `export type ${this.updateTypeName}={${sigs.join(';')}}`;
  }

  get findUniqueTypeDeclaration(): string {
    const sigs = [this.primaryKeyTypeName, ...this.findUniqueTypes];
    // tests depend on maintaining this spacing
    return `export type ${this.findUniqueTypeName}=${sigs.join('|')}`;
  }

  get dbTypeDeclaration(): string {
    const sigs = [
      this.modelName,
      this.selectAllTypeName,
      this.primaryKeyTypeName,
      this.createTypeName,
      this.updateTypeName,
      this.findUniqueTypeName
    ];
    return `export type ${this.dbTypeName}=<${sigs.join(',')}>`;
  }

  toJSON(): IModel {
    return {
      modelName: this.modelName,
      tableName: this.tableName,
      fields: this.fields
    };
  }
}
