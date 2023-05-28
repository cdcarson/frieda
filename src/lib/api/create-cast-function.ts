import {
  type Cast,
  type Field,
  cast as defaultCast
} from '@planetscale/database';
import {
  CAST_TYPES,
  type CastType,
  type CustomModelCast,
  type SchemaCastMap
} from './types.js';

export const createCastFunction = <M extends Record<string, unknown>>(
  schemaCast: SchemaCastMap,
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
        return decode(value);
    }

    return defaultCast(field, value);
  };
  return fn;
};
