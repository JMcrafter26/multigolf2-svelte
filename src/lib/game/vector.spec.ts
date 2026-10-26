import { describe, expect, it } from 'vitest';
import { calcLineIntersection, Vector2d } from './vector';

describe('Vector2d', () => {
	it('performs the basic arithmetic used by the simulation', () => {
		const a = new Vector2d(3, 4);
		expect(a.length).toBe(5);
		expect(a.normalized.toArray()).toEqual([0.6, 0.8]);
		expect(a.add(new Vector2d(1, -1)).toArray()).toEqual([4, 3]);
		expect(a.sub(new Vector2d(1, 1)).toArray()).toEqual([2, 3]);
		expect(a.scale(2).toArray()).toEqual([6, 8]);
		expect(a.distance(new Vector2d(0, 0))).toBe(5);
	});

	it('mutates in place for the hot paths', () => {
		const value = new Vector2d(1, 2);
		value.iadd(new Vector2d(2, 3)).iscale(2);
		expect(value.toArray()).toEqual([6, 10]);
	});

	it('clamps and rotates', () => {
		const value = new Vector2d(1, 0);
		value.irotate(Math.PI / 2);
		expect(value.x).toBeCloseTo(0);
		expect(value.y).toBeCloseTo(1);

		const clamped = new Vector2d(3, -4).clampX([0, 50], 5).clampY([0, 50], 5);
		expect(clamped.toArray()).toEqual([0, 0]);
		expect(new Vector2d(30, 60).clampX([0, 50], 5).toArray()).toEqual([30, 60]);
	});

	it('parses strings like the saved level format', () => {
		expect(Vector2d.fromString('12, 34').toArray()).toEqual([12, 34]);
		expect(() => Vector2d.fromString('nope')).toThrow();
	});
});

describe('calcLineIntersection', () => {
	it('finds crossing lines', () => {
		const intersection = calcLineIntersection(
			new Vector2d(0, 0),
			new Vector2d(10, 10),
			new Vector2d(0, 10),
			new Vector2d(10, 0)
		);
		expect(intersection?.x).toBeCloseTo(5);
		expect(intersection?.y).toBeCloseTo(5);
	});

	it('returns null for parallel lines', () => {
		expect(
			calcLineIntersection(
				new Vector2d(0, 0),
				new Vector2d(10, 0),
				new Vector2d(0, 1),
				new Vector2d(10, 1)
			)
		).toBeNull();
	});
});
