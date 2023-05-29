import type { ColumnRow, ParsedAnnotation, Annotation } from './types.js';
import camelcase from 'camelcase';
import { fmtVal, getParenthesizedArgs } from './utils.js';
import { DEFAULT_JSON_FIELD_TYPE } from './constants.js';
import {
  type FieldDefinition,
  MYSQL_TYPES,
  type MysqlBaseType,
  type CastType
} from '../api/types.js';
import kleur from 'kleur';
export class Field {
  #column: ColumnRow;
  constructor(column: ColumnRow) {
    this.#column = column;
  }

  get column(): ColumnRow {
    return this.#column;
  }
  get columnName(): string {
    return this.column.Field;
  }

  get fieldName(): string {
    return camelcase(this.columnName);
  }

  get isPrimaryKey(): boolean {
    return this.column.Key === 'PRI';
  }

  get isAutoIncrement(): boolean {
    return /\bauto_increment\b/i.test(this.column.Extra);
  }
  get isUnique(): boolean {
    return this.column.Key === 'UNI';
  }

  get hasDefault(): boolean {
    return (
      typeof this.column.Default === 'string' ||
      (this.isNullable && this.column.Default === null)
    );
  }
  get isNullable(): boolean {
    return this.column.Null === 'YES';
  }

  get defaultValue(): string | null | undefined {
    return this.hasDefault ? this.column.Default : undefined;
  }

  get isGeneratedAlways(): boolean {
    return /\b(VIRTUAL|STORED) GENERATED\b/i.test(this.column.Extra);
  }

  get isInvisible(): boolean {
    return /\bINVISIBLE\b/i.test(this.column.Extra);
  }

  get mysqlBaseType(): MysqlBaseType | null {
    const rx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
    const match = this.column.Type.match(rx);
    if (match) {
      return match[0].toLowerCase() as MysqlBaseType;
    }
    return null;
  }

  get typeAnnotations(): ParsedAnnotation[] {
    const rx = /(?:^|\s+)@(bigint|enum|set|json)(?:\((.*)\))?/gi;
    const result: ParsedAnnotation[] = Array.from(
      this.column.Comment.matchAll(rx)
    ).map((r) => {
      return {
        fullAnnotation: r[0].trim(),
        annotation: r[1].toLowerCase() as Annotation,
        typeArgument: r[2]
      };
    });
    return result;
  }
  get bigIntAnnotation(): ParsedAnnotation | undefined {
    return this.typeAnnotations.find((a) => a.annotation === 'bigint');
  }

  get setAnnotation(): ParsedAnnotation | undefined {
    return this.typeAnnotations.find((a) => a.annotation === 'set');
  }

  /**
   * This annotation requires a type, so if none is provided,
   * returns undefined
   */
  get jsonAnnotation(): Required<ParsedAnnotation> | undefined {
    const typeAnnotation = this.typeAnnotations.find(
      (a) => a.annotation === 'json'
    );
    if (
      !typeAnnotation ||
      !typeAnnotation.typeArgument ||
      typeAnnotation.typeArgument.trim().length === 0
    ) {
      return;
    }

    return typeAnnotation as Required<ParsedAnnotation>;
  }

  get isTinyIntOne(): boolean {
    return (
      'tinyint' === this.mysqlBaseType &&
      getParenthesizedArgs(this.column.Type, 'tinyint').trim() === '1'
    );
  }

  get castType(): CastType {
    if ('json' === this.mysqlBaseType) {
      return 'json';
    }
    if ('bigint' === this.mysqlBaseType) {
      return this.bigIntAnnotation ? 'bigint' : 'string';
    }
    if (this.isTinyIntOne) {
      return 'boolean';
    }
    // not sure if this will ever be the case, but for completeness...
    if ('bool' === this.mysqlBaseType || 'boolean' === this.mysqlBaseType) {
      return 'boolean';
    }

    if ('set' === this.mysqlBaseType) {
      if (this.setAnnotation) {
        return 'set';
      }
      return 'string';
    }

    if ('enum' === this.mysqlBaseType) {
      return 'string';
    }

    switch (this.mysqlBaseType) {
      case 'tinyint':
      case 'int':
      case 'integer':
      case 'smallint':
      case 'mediumint':
      case 'year':
        return 'int';
      case 'float':
      case 'double':
      case 'decimal':
      case 'numeric':
      case 'real':
        return 'float';
      case 'date':
      case 'datetime':
      case 'timestamp':
        return 'date';
    }
    // everything else is cast to string, including time, bit, etc,
    // also the case where mysqlBaseType is null
    return 'string';
  }


  get javascriptEnumerableType(): string 

  get javascriptType(): string {
    if ('json' === this.castType) {
      return this.jsonAnnotation
        ? this.jsonAnnotation.typeArgument.trim()
        : DEFAULT_JSON_FIELD_TYPE;
    }

    if ('set' === this.castType) {

      if (this.setAnnotation) {
        const strings = getParenthesizedArgs(this.column.Type, 'set')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .join('|');
        return strings.length > 0 ? `Set<${strings}>` : `Set<string>`;
      }
      return 'string'
    }

    if ('enum' === this.mysqlBaseType) {
      const strings = getParenthesizedArgs(this.column.Type, 'enum')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join('|');
      return strings.length > 0 ? strings : `string`;
    }

    switch (this.castType) {
      case 'bigint':
        return 'bigint';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'Date';
      case 'float':
      case 'int':
        return 'number';
      case 'string':
      default:
        return 'string';
    }
  }

  get jsTypeExplanation(): string {
    if (!this.mysqlBaseType) {
      return `Unhandled column type ${
        this.column.Type
      }. Typed and cast as javascript ${fmtVal('string')}.`;
    }
    if ('json' === this.mysqlBaseType) {
      if (!this.jsonAnnotation) {
        return `No ${kleur.red(
          '@json'
        )} type annotation. Using default JSON type: ${fmtVal(
          DEFAULT_JSON_FIELD_TYPE
        )}.`;
      }
      return `Using type from the ${kleur.red('@json')} type annotation.`;
    }
    if (this.isTinyIntOne) {
      return `Default type for ${fmtVal('tinyint(1)')} columns.`;
    }
    if ('bigint' === this.mysqlBaseType) {
      if (this.bigIntAnnotation) {
        return `Found  ${kleur.red('@bigint')} type annotation.`;
      }
      return `Default type for ${fmtVal('bigint')} columns.`;
    }
    if ('enum' === this.mysqlBaseType) {
      return `Using the column's enum definition.`;
    }

    if ('set' === this.mysqlBaseType) {
      if (this.setAnnotation) {
        return `Using the ${kleur.red('@set')} type annotation.`;
      }
    }

    return `Default type for ${fmtVal(this.mysqlBaseType)} columns.`;
  }

  toJSON(): FieldDefinition {
    return {
      columnName: this.columnName,
      fieldName: this.fieldName,
      isAutoIncrement: this.isAutoIncrement,
      isPrimaryKey: this.isPrimaryKey,
      castType: this.castType,
      mysqlBaseType: this.mysqlBaseType,
      hasDefault: this.hasDefault
    };
  }
}
