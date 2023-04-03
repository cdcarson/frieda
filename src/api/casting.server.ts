import type { Cast, Field } from '@planetscale/database';
import {
  SimplifiedDatabaseType,
  type CustomModelCast,
  type Model,
  type SchemaCast
} from './shared.server.js';

export const createCastFunction = <M extends Model>(
  schemaCast: SchemaCast,
  customModelCast?: CustomModelCast<M>
): Cast => {
  const custom: CustomModelCast<M> = customModelCast || {};
  const typeValues = Object.values(SimplifiedDatabaseType);
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
    let dbType: SimplifiedDatabaseType | undefined = undefined;
    if (typeValues.includes(custom[field.name] as SimplifiedDatabaseType)) {
      dbType = custom[field.name] as SimplifiedDatabaseType;
    } else if (field.orgTable && field.orgName) {
      const tc =
        `${field.orgTable}.${field.orgName}` as keyof typeof schemaCast;
      if (typeValues.includes(schemaCast[tc])) {
        dbType = schemaCast[tc];
      }
    }

    switch (dbType) {
      case SimplifiedDatabaseType.BigInt:
        return BigInt(value);
      case SimplifiedDatabaseType.Boolean:
        return parseInt(value) > 0;
      case SimplifiedDatabaseType.Date:
        return new Date(value);
      case SimplifiedDatabaseType.Float:
        return parseFloat(value);
      case SimplifiedDatabaseType.Int:
        return parseInt(value);
      case SimplifiedDatabaseType.Enum:
      case SimplifiedDatabaseType.Key:
      case SimplifiedDatabaseType.String:
        return decode(value);
      case SimplifiedDatabaseType.Json:
        return JSON.parse(decode(value));
      default:
        // At this point the "SimplifiedDatabaseType" is  undefined,
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
