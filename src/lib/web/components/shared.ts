import type { MysqlBaseType } from "$lib/index.js";

export const STRING_TYPES_WITH_LENGTH: MysqlBaseType[] = ['char', 'varchar', 'binary', 'varbinary']

export  const VARCHAR_MAX_LENGTH = 65_535;
export const CHAR_MAX_LENGTH = 255;
export const DECIMAL_MAX_DIGITS = 65;

export const INTEGER_TYPES:  MysqlBaseType[] = [
  'bigint',
  'int',
  'integer',
  'mediumint',
  'smallint',
  'tinyint',
  'bool',
  'boolean'
];

export const INT_TYPE_BYTES: {types: MysqlBaseType[], bytes: number}[] = [
  {
    types: ['bigint'],
    bytes: 8
  },
  {
    types: ['int', 'integer'],
    bytes: 4
  },
  {
    types: ['mediumint'],
    bytes: 3
  },
  {
    types: ['smallint'],
    bytes: 2
  },
  {
    types: ['tinyint', 'bool', 'boolean'],
    bytes: 1
  }
] 



export const getBoundsByIntType = (
  type: MysqlBaseType,
  unsigned: boolean
): { min: bigint; max: bigint } => {

  // there's a js pow bug/thing with  bigints, so just give the value...
  if ('bigint' === type) {
    if (unsigned) {
      return {min: BigInt(0), max: BigInt('18446744073709551615')}
    } else {
      return {min: BigInt('-9223372036854775808'), max: BigInt('9223372036854775807')}
    }
  }
  const entry = INT_TYPE_BYTES.find(o => o.types.includes(type));
  if (! entry) {
    return {max: 0n, min: 0n}
  }
  const bits = (entry.bytes) * 8;
  
  if (unsigned) {
    return { min: BigInt(0), max: BigInt(Math.pow(2, bits) - 1) };
  }
  return {
    min: BigInt(Math.pow(-2, bits - 1)),
    max: BigInt(Math.pow(2, bits - 1) - 1)
  };
};