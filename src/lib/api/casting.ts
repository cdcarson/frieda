import type { Cast, Field } from '@planetscale/database';
import {
  CAST_TYPES,
  type CastType,
  type CustomModelCast,
  type Model,
  type SchemaCast
} from '$lib/types.js';

export const createCastFunction = <M extends Model>(
  schemaCast: SchemaCast,
  customModelCast?: CustomModelCast<M>
): Cast => {
  const custom: CustomModelCast<M> = customModelCast || {};
  const decoder = new TextDecoder('utf-8');
  const decode = (text: string | null): string => {
    return text ? decoder.decode(Uint8Array.from(bytes(text))) : '';
  };
  const bytes = (text: string): number[] => {
    return text.split('').map((c) => c.charCodeAt(0));
  };
  const fn: Cast = (field: Field, value: string | null) => {
    if (value === null || value === '') {
      return value;
    }
    let castType: CastType | undefined = undefined;

    if (CAST_TYPES.includes(custom[field.name] as CastType)) {
      castType = custom[field.name];
    } else if (field.orgTable && field.orgName) {
      const tc =
        `${field.orgTable}.${field.orgName}` as keyof typeof schemaCast;
      if (CAST_TYPES.includes(schemaCast[tc])) {
        castType = schemaCast[tc];
      }
    }

    switch (castType) {
      case 'bigint':
        return BigInt(value);
      case 'boolean':
        return parseInt(value) !== 0;
      case 'date':
        return new Date(value);
      case 'float':
        return parseFloat(value);
      case 'int':
        return parseInt(value);
      case 'set':
        return new Set(decode(value).split(','));
      case 'json':
        return JSON.parse(decode(value));
      case 'string':
      case 'enum':
        return decode(value);
      default:
        // At this point the is  undefined,
        // so just fall through to the default handling below
        break;
    }

    switch (field.type) {
      case 'DATETIME':
        return new Date(value);
      case 'INT8':
      case 'INT16':
      case 'INT24':
      case 'INT32':
      case 'UINT8':
      case 'UINT16':
      case 'UINT24':
      case 'UINT32':
      case 'YEAR':
        return parseInt(value, 10);
      case 'FLOAT32':
      case 'FLOAT64':
        return parseFloat(value);
      case 'DECIMAL':
      case 'INT64':
      case 'UINT64':
      case 'DATE':
      case 'TIME':
      case 'TIMESTAMP':
      case 'BLOB':
      case 'BIT':
      case 'VARBINARY':
      case 'BINARY':
        return value;
      case 'JSON':
        return JSON.parse(decode(value));
      default:
        return decode(value);
    }
  };
  return fn;
};