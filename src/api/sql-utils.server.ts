import sql, { raw, join, Sql, empty } from 'sql-template-tag';
import type {
  Model,
  ModelOrderByInput,
  ModelWhereInput,
  OneBasedPagingInput
} from './shared.server';

/**
 * Places backticks around a string.
 * If an array is passed, bacticks each element and joins with '.'.
 */
export const bt = (unticked: string | string[]): Sql => {
  const arr: string[] = typeof unticked === 'string' ? [unticked] : unticked;
  return join(
    arr.map((s) => raw(`\`${s}\``)),
    '.'
  );
};

/**
 * Returns a WHERE phrase as an instance of Sql, or if the input is undefined, empty.
 *
 * The input can be a partial of the model being queried,  an instance of Sql, or undefined.
 * - A partial of the model returns results in key=value comparisons joined with AND.
 * - Sql returns itself, prepended with 'WHERE'. Use this if you need to compare on something other than equality.
 *   Remember not to add 'WHERE' at the beginning.
 * - undefined returns empty
 */
export const getWhere = <M extends Model>(
  input: ModelWhereInput<M>,
  tableName?: string
): Sql => {
  if (!input) {
    return empty;
  }
  if (input instanceof Sql) {
    return sql`WHERE ${input}`;
  }
  const ands = Object.keys(input).map((k) => {
    const v = input[k];
    const ticked = tableName ? bt([tableName, k]) : bt(k);
    return sql`${ticked} = ${v}`;
  });
  return ands.length > 0 ? sql`WHERE ${join(ands, ' AND ')}` : empty;
};

/**
 * Returns an ORDER BY phrase as Sql, or if the input is undefined, empty.
 *
 * The input can be {col: keyof M; dir: 'asc' | 'desc';}, an array of that type, Sql, or undefined.
 *
 * If you pass Sql, remember not to add 'ORDER BY' at the beginning.
 */
export const getOrderBy = <M extends Model>(
  orderBy: ModelOrderByInput<M>,
  tableName?: string
): Sql => {
  if (!orderBy) {
    return empty;
  }
  if (orderBy instanceof Sql) {
    return sql`ORDER BY ${orderBy}`;
  }
  const cols: { col: keyof M & string; dir: 'asc' | 'desc' }[] = Array.isArray(
    orderBy
  )
    ? orderBy
    : [orderBy];
  const orders = cols.map((c) => {
    const ticked = tableName ? bt([tableName, c.col]) : bt(c.col);
    return sql`${ticked} ${raw(c.dir)}`;
  });
  return orders.length > 0 ? join(orders) : empty;
};

/**
 * Returns LIMIT OFFSET phrase
 *  - `LIMIT <rpp> OFFSET <0-based-index>`
 *  - or empty if paging is undefined
 *
 * Remember that the first page is 1, not 0.
 */
export const getLimitOffset = (paging: OneBasedPagingInput): Sql => {
  if (!paging) {
    return empty;
  }
  return raw(`LIMIT ${paging.rpp} OFFSET ${(paging.page - 1) * paging.rpp}`);
};
