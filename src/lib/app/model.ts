import camelcase from 'camelcase';
import type {
  FetchedTable,
  Index,
  TypeDeclarationWithDescription,
  TypeDeclarationWithFieldNotes,
  TypeDeclarationWithNotes
} from './types.js';
import { Field } from './field.js';
import type { ModelDefinition } from '../api/types.js';
import { fmtVal, fmtVarName } from './utils.js';
import kleur from 'kleur';

export class Model {
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

  get findUniqueTypes(): { indexName: string; declaration: string }[] {
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
        return {
          declaration: `{${fieldSignatures.join(';')}}`,
          indexName: i.indexName
        };
      });
  }

  /**
   * The model's base type.
   * Fields are optional if the column is INVISIBLE.
   */
  get modelTypeDeclaration(): TypeDeclarationWithFieldNotes {
    // tests depend on spacing
    const sigs = this.fields.map((f) => {
      const opt = f.isInvisible ? '?' : '';
      const orNull = f.isNullable ? '|null' : '';
      return `${f.fieldName}${opt}:${f.javascriptType}${orNull}`;
    });
    const description = `
        The base type for the ${fmtVal(this.modelName)} model.
        Note that fields where the underlying column is 
        ${kleur.red('INVISIBLE')} are optional,
        since such columns are omitted when the model is 
        queried with ${kleur.red('SELECT *')}.
    `;
    const notes: { [fieldName: string]: string } = this.fields.reduce(
      (acc, f) => {
        const copy: { [fieldName: string]: string } = { ...acc };
        if (f.isInvisible) {
          copy[f.fieldName] = `
            ${fmtVarName(f.fieldName)} is optional in ${fmtVal(this.modelName)} 
            (column is ${kleur.red('INVISIBLE')}.)`;
        }
        return copy;
      },
      {} as { [fieldName: string]: string }
    );
    return {
      typeName: this.modelName,
      declaration: `export type ${this.modelName}={${sigs.join(';')}}`,
      description,
      notes
    };
  }

  /**
   * The model's select all type.
   * Fields are omitted if the column is INVISIBLE.
   */
  get selectAllTypeDeclaration(): TypeDeclarationWithFieldNotes {
    // tests depend on spacing
    const sigs = this.fields
      .filter((f) => !f.isInvisible)
      .map((f) => {
        const orNull = f.isNullable ? '|null' : '';
        return `${f.fieldName}:${f.javascriptType}${orNull}`;
      });
    
    const description = `
        The representation the ${fmtVal(this.modelName)} model
        when queried with ${kleur.red('SELECT *')}.
        Fields where the underlying column is 
        ${kleur.red('INVISIBLE')} are omitted,
        since such columns are omitted  with ${kleur.red('SELECT *')}.
    `;
    const notes: { [fieldName: string]: string } = this.fields.reduce(
      (acc, f) => {
        const copy: { [fieldName: string]: string } = { ...acc };
        if (f.isInvisible) {
          copy[f.fieldName] = `
            ${fmtVarName(f.fieldName)} is omitted in ${fmtVal(
            this.selectAllTypeName
          )} 
            (column is ${kleur.red('INVISIBLE')}.)`;
        }
        return copy;
        return copy;
      },
      {} as { [fieldName: string]: string }
    );
    const type = sigs.length === 0 ? 'Record<string,never>' : `{${sigs.join(';')}}`
    return {
      typeName: this.selectAllTypeName,
      declaration: `export type ${this.selectAllTypeName}=${type}`,
      description,
      notes
    };
  }
  get primaryKeyTypeDeclaration(): TypeDeclarationWithFieldNotes {
    // tests depend on spacing
    const sigs = this.fields
      .filter((f) => f.isPrimaryKey)
      .map((f) => {
        return `${f.fieldName}:${f.javascriptType}`;
      });
    const description = `The primary key type for ${fmtVal(
      this.modelName
    )} model.
    This type is used to update and delete models, and is the return type
    when you create a new ${fmtVal(this.modelName)}.`;
    const notes: { [fieldName: string]: string } = this.fields.reduce(
      (acc, f) => {
        const copy: { [fieldName: string]: string } = { ...acc };
        if (f.isPrimaryKey) {
          copy[f.fieldName] = `${fmtVarName(
            f.fieldName
          )} is included in ${fmtVal(this.primaryKeyTypeName)} (column is a primary key.)`;
        }
        return copy;
      },
      {} as { [fieldName: string]: string }
    );
    const type = sigs.length === 0 ? 'Record<string,never>' : `{${sigs.join(';')}}`
    return {
      typeName: this.primaryKeyTypeName,
      declaration: `export type ${this.primaryKeyTypeName}=${type}`,
      description,
      notes
    };
  }

  /**
   * The model's create type.
   * Fields are omitted if the column is GENERATED.
   * Fields are optional if the column is auto_increment or has a default value.
   */
  get createTypeDeclaration(): TypeDeclarationWithFieldNotes {
    // tests depend on spacing
    const sigs = this.fields
      .filter((f) => !f.isGeneratedAlways)
      .map((f) => {
        const opt = f.isAutoIncrement || f.hasDefault ? '?' : '';
        const orNull = f.isNullable ? '|null' : '';
        return `${f.fieldName}${opt}:${f.javascriptType}${orNull}`;
      });
    const description = `
        Data passed to create a new ${fmtVal(this.modelName)} model.
        Fields where the underlying column is 
        ${kleur.red('GENERATED')} are omitted.
        Fields where the underlying column is 
        ${kleur.red('auto_increment')} or has a default value are optional.`;
    const notes: { [fieldName: string]: string } = this.fields.reduce(
      (acc, f) => {
        const copy: { [fieldName: string]: string } = { ...acc };
        if (f.isGeneratedAlways) {
          copy[f.fieldName] = `${fmtVarName(
            f.fieldName
          )} is omitted from ${fmtVal(this.createTypeName)} (column is ${kleur.red('GENERATED')}`;
        } else if (f.isAutoIncrement) {
          copy[f.fieldName] = `${fmtVarName(
            f.fieldName
          )} is optional in ${fmtVal(this.createTypeName)} (column is auto_increment.)`;
        } else if (f.hasDefault) {
          copy[f.fieldName] = `${fmtVarName(
            f.fieldName
          )} is optional in ${fmtVal(this.createTypeName)} (column has a default.)`
          
        }
        return copy;
      },
      {} as { [fieldName: string]: string }
    );
    const type = sigs.length === 0 ? 'Record<string,never>' : `{${sigs.join(';')}}`
    return {
      typeName: this.createTypeName,
      declaration: `export type ${this.createTypeName}=${type}`,
      description,
      notes
    };
  }
  /**
   * The model's update type.
   * Fields omitted if the column is GENERATED or a primary key.
   */
  get updateTypeDeclaration(): TypeDeclarationWithFieldNotes {
    // tests depend on spacing
    const sigs = this.fields
      .filter((f) => !f.isGeneratedAlways && !f.isPrimaryKey)
      .map((f) => {
        const orNull = f.isNullable ? '|null' : '';
        return `${f.fieldName}?:${f.javascriptType}${orNull}`;
      });

    const description = `
        Data passed to update an existing ${fmtVal(this.modelName)} model.
        Fields where the underlying column is 
        ${kleur.red('GENERATED')} or is a primary key are omitted.`;
    const notes: { [fieldName: string]: string } = this.fields.reduce(
      (acc, f) => {
        const copy: { [fieldName: string]: string } = { ...acc };
        if (f.isGeneratedAlways) {
          copy[f.fieldName] = `${fmtVarName(
            f.fieldName
          )} is omitted from ${fmtVal(this.updateTypeName)} (column is ${kleur.red('GENERATED')}.)`;
        } else if (f.isPrimaryKey) {
          copy[f.fieldName] = `${fmtVarName(
            f.fieldName
          )} is omitted from ${fmtVal(this.updateTypeName)} (column is a primary key.)`;
        }
        return copy;
      },
      {} as { [fieldName: string]: string }
    );
    const type = sigs.length === 0 ? 'Record<string,never>' : `{${sigs.join(';')}}`
    return {
      typeName: this.updateTypeName,
      declaration: `export type ${this.updateTypeName}=${type}`,
      description,
      notes
    };
  }

  get findUniqueTypeDeclaration(): TypeDeclarationWithNotes {
    const uniqueTypes = this.findUniqueTypes;
    const sigs = [
      this.primaryKeyTypeName,
      ...uniqueTypes.map((t) => t.declaration)
    ];
    const description = `
      Type representing how to uniquely select a ${fmtVal(
        this.modelName
      )} model.
      This includes the ${fmtVal(this.primaryKeyTypeName)} primary key type 
      plus types derived from the table's other unique indexes.`;
    const notes: string[] = uniqueTypes.map(
      (t) => `Unique index: ${fmtVal(t.indexName)}`
    );
    // tests depend on maintaining this spacing
    return {
      typeName: this.findUniqueTypeName,
      declaration: `export type ${this.findUniqueTypeName}=${sigs.join('|')}`,
      description,
      notes
    };
  }

  get dbTypeDeclaration(): TypeDeclarationWithDescription {
    const sigs = [
      this.modelName,
      this.selectAllTypeName,
      this.primaryKeyTypeName,
      this.createTypeName,
      this.updateTypeName,
      this.findUniqueTypeName
    ];
    const description = `The ${fmtVal('ModelDb')} type for the ${fmtVal(
      this.modelName
    )} model. `;
    return {
      typeName: this.dbTypeName,
      declaration: `export type ${this.dbTypeName}=ModelDb<${sigs.join(',')}>`,
      description
    };
  }

  toJSON(): ModelDefinition {
    return {
      modelName: this.modelName,
      tableName: this.tableName,
      fields: this.fields
    };
  }
}
