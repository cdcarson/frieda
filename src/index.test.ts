import { describe, it, expect } from 'vitest';
import sql from 'sql-template-tag';
describe('sum test', () => {
	it('adds 1 + 2 to equal 3', () => {
		expect(1 + 2).toBe(3);
	});
});

describe('sql', () => {
	it('should work', () => {
		expect(sql`SELECT`.sql).toBe('SELECT');
	});
});