import camelcase from 'camelcase';
import type { ColumnRow, ParsedAnnotation } from './shared.js';
import { getParenthesizedArgs, getValidJavascriptIdentifier } from './utils.js';
import { MYSQL_TYPES, type CastType, type MysqlBaseType } from '$lib/index.js';
import { DEFAULT_JSON_FIELD_TYPE } from '$lib/constants.js';

export class Field {
  constructor(public readonly column: ColumnRow) {}
  get columnName(): string {
    return this.column.Field;
  }
  get fieldName(): string {
    return getValidJavascriptIdentifier(camelcase(this.columnName));
  }
  get mysqlBaseType(): MysqlBaseType | null {
    const baseTypeRx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
    const baseTypeMatch = this.column.Type.match(baseTypeRx);
    return baseTypeMatch
      ? (baseTypeMatch[0].toLowerCase() as MysqlBaseType)
      : null;
  }
  get isPrimaryKey(): boolean {
    return /\bPRI\b/i.test(this.column.Key);
  }

  get isUnique(): boolean {
    return /\bUNI\b/i.test(this.column.Key);
  }

  get isAutoIncrement(): boolean {
    return /\bauto_increment\b/i.test(this.column.Extra);
  }
  get isNullable(): boolean {
    return this.column.Null === 'YES';
  }

  get hasDefault(): boolean {
    return (
      typeof this.column.Default === 'string' ||
      (this.isNullable && this.column.Default === null)
    );
  }

  get defaultValue(): string | null | undefined {
    return this.hasDefault ? this.column.Default : undefined;
  }

  get isGeneratedAlways(): boolean {
    return /\b(VIRTUAL|STORED) GENERATED\b/i.test(this.column.Extra);
  }

  get isTinyIntOne(): boolean {
    return (
      'tinyint' === this.mysqlBaseType &&
      getParenthesizedArgs(this.column.Type, 'tinyint').trim() === '1'
    );
  }
  get isInvisible(): boolean {
    return /\bINVISIBLE\b/i.test(this.column.Extra);
  }

  get typeAnnotations(): ParsedAnnotation[] {
    const annotationRx = /(?:^|\s+)@(bigint|set|json)(?:\((.*)\))?/gi;
    return Array.from(this.column.Comment.matchAll(annotationRx)).map((r) => {
      return {
        fullAnnotation: r[0].trim(),
        annotation: r[1].toLowerCase() as 'bigint' | 'set' | 'json',
        typeArgument: r[2]
      };
    });
  }
  get bigIntAnnotation(): ParsedAnnotation | undefined {
    return this.mysqlBaseType === 'bigint'
      ? this.typeAnnotations.find((a) => a.annotation === 'bigint')
      : undefined;
  }

  get setAnnotation(): ParsedAnnotation | undefined {
    return this.mysqlBaseType === 'set'
      ? this.typeAnnotations.find((a) => a.annotation === 'set')
      : undefined;
  }
  get jsonAnnotation(): Required<ParsedAnnotation> | undefined {
    if (this.mysqlBaseType !== 'json') {
      return undefined;
    }
    const annotation = this.typeAnnotations.find(
      (a) => a.annotation === 'json'
    );
    return annotation && typeof annotation.typeArgument === 'string'
      ? (annotation as Required<ParsedAnnotation>)
      : undefined;
  }

  get jsEnumerableStringType(): string | undefined {
    if (this.mysqlBaseType === 'set' || this.mysqlBaseType === 'enum') {
      const t = getParenthesizedArgs(this.column.Type, this.mysqlBaseType || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join('|');
      return t.length > 0 ? t : 'string';
    }
  }

  get castType(): CastType {
    switch (this.mysqlBaseType) {
      case 'json':
        return 'json';
      case 'tinyint':
        return this.isTinyIntOne ? 'boolean' : 'int';
      // not sure if this will ever be the case, but for completeness...
      case 'bool':
      case 'boolean':
        return 'boolean';
      case 'bigint':
        return this.bigIntAnnotation ? 'bigint' : 'string';
      case 'set':
        return this.setAnnotation ? 'set' : 'string';
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
      default:
        return 'string';
    }
  }
  get javascriptType(): string {
    if ('json' === this.castType) {
      return this.jsonAnnotation
        ? this.jsonAnnotation.typeArgument
        : DEFAULT_JSON_FIELD_TYPE;
    }
    if ('set' === this.castType) {
      return this.setAnnotation
        ? `Set<${this.jsEnumerableStringType}>`
        : 'string';
    }
    if ('enum' === this.mysqlBaseType) {
      return this.jsEnumerableStringType || 'string';
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

  get modelTypePropertySignature(): string {
    const opt = this.isInvisible ? '?' : '';
    const orNull = this.isNullable ? '|null' : '';
    return `${this.fieldName}${opt}:${this.javascriptType}${orNull}`;
  }
  get selectAllTypePropertySignature(): string|undefined {
    if(! this.isInvisible) {
      const orNull = this.isNullable ? '|null' : '';
    return `${this.fieldName}:${this.javascriptType}${orNull}`;
    }
  }
}
