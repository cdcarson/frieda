import { describe, it, expect } from 'vitest';

import { bt, getOrderBy, getSearchSql, getWhere } from './sql-utils.js';
import sql, { empty } from 'sql-template-tag';

describe('bt', () => {
  it('should handle a string without a dot', () => {
    expect(bt('a').sql).toBe('`a`');
  });
  it('should handle a string with a dot', () => {
    expect(bt('a.b').sql).toBe('`a`.`b`');
  });
  it('should handle two strings', () => {
    expect(bt('a', 'b').sql).toBe('`a`.`b`');
  });
});

describe('getWhere', () => {
  it('model where', () => {
    const where = getWhere({ a: 'foo', b: 'bar' });
    expect(where.sql).toEqual(
      expect.stringMatching(/^WHERE\s+`a`\s+=\s+\?\s+AND\s+`b`\s+=\s+\?/)
    );
    expect(where.values).toEqual(['foo', 'bar']);
  });
  it('model where with table name', () => {
    const where = getWhere({ a: 'foo', b: 'bar' }, 't');
    expect(where.sql).toEqual(
      expect.stringMatching(
        /^WHERE\s+`t`.`a`\s+=\s+\?\s+AND\s+`t`.`b`\s+=\s+\?/
      )
    );
    expect(where.values).toEqual(['foo', 'bar']);
  });
  it('model empty where', () => {
    const where = getWhere({});
    expect(where).toBe(empty);
    expect(where.values).toEqual([]);
  });
  it('sql where', () => {
    const foo = 1;
    const where = getWhere(sql`id=${foo}`);
    expect(where.sql).toEqual('WHERE id=?');
    expect(where.values).toEqual([1]);
  });
});

describe('getOrderBy', () => {
  it('sql', () => {
    const orderBy = sql`fries`;
    expect(getOrderBy(orderBy).sql).toBe('ORDER BY fries');
  });
  it('model order by is obj', () => {
    expect(getOrderBy({ col: 'a', dir: 'desc' }).sql).toBe('ORDER BY `a` desc');
  });
  it('model order by w table', () => {
    expect(getOrderBy({ col: 'a', dir: 'desc' }, 't').sql).toBe(
      'ORDER BY `t`.`a` desc'
    );
  });
  it('model order by is array', () => {
    expect(getOrderBy([{ col: 'a', dir: 'desc' }]).sql).toBe(
      'ORDER BY `a` desc'
    );
  });
  it('model with more than one order field', () => {
    expect(
      getOrderBy([
        { col: 'a', dir: 'desc' },
        { col: 'b', dir: 'asc' }
      ]).sql
    ).toBe('ORDER BY `a` desc,`b` asc');
  });
  it('model with no order by', () => {
    expect(getOrderBy([]).sql).toBe('');
  });
});
describe('getSearchSql', () => {
  // need some tests..
  it('works', () => {
    getSearchSql(
      [
        {
          key: 'UserProfile_name_bio_location_idx',
          tableName: 'UserProfile',
          indexedFields: ['name', 'bio', 'location']
        }
      ],
      'foo'
    );
  });
});
