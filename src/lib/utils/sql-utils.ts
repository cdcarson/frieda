import { raw, join, Sql } from 'sql-template-tag';

/**
 * Places backticks around a string, accounting for cases where 
 * the string refers to a table and column, separated with a dot.
 * bt('a') => `a`
 * bt('a.b') => `a`.`b`
 */
export const bt = (unticked: string): Sql => {
  const arr: string[] = unticked.split('.');
  return join(
    arr.map((s) => raw(`\`${s}\``)),
    '.'
  );
};