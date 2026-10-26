/** A small, dependency-free 2D vector used by the simulation and renderer. */
export interface VectorLike {
	x: number;
	y: number;
}

export class Vector2d implements VectorLike {
	constructor(
		public x = 0,
		public y = 0
	) {}

	static get zero(): Vector2d {
		return new Vector2d(0, 0);
	}

	static fromObject(obj: VectorLike | null | undefined): Vector2d | null {
		if (!obj) return null;
		if (!Number.isFinite(obj.x) || !Number.isFinite(obj.y)) {
			throw new Error('Vector object must have numeric x and y properties');
		}
		return new Vector2d(obj.x, obj.y);
	}

	static fromAngle(angle: number): Vector2d {
		return new Vector2d(Math.cos(angle), Math.sin(angle));
	}

	static fromPolar(magnitude: number, angle: number): Vector2d {
		return new Vector2d(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
	}

	static fromArray([x, y]: readonly [number, number]): Vector2d {
		return new Vector2d(x, y);
	}

	static fromString(value: string): Vector2d {
		const parts = value.split(',');
		if (parts.length !== 2) {
			throw new Error('String must be made up of two numbers separated by a comma');
		}
		const x = Number.parseFloat(parts[0]);
		const y = Number.parseFloat(parts[1]);
		if (!Number.isFinite(x) || !Number.isFinite(y)) {
			throw new Error('String contains invalid number(s)');
		}
		return new Vector2d(x, y);
	}

	static random(): Vector2d {
		return Vector2d.fromAngle(Math.random() * Math.PI * 2);
	}

	toObject(): VectorLike {
		return { x: this.x, y: this.y };
	}

	toArray(): [number, number] {
		return [this.x, this.y];
	}

	get length(): number {
		return Math.hypot(this.x, this.y);
	}

	get squaredLength(): number {
		return this.x * this.x + this.y * this.y;
	}

	get normalized(): Vector2d {
		const length = this.length;
		if (length === 0) return new Vector2d(0, 0);
		return new Vector2d(this.x / length, this.y / length);
	}

	get angle(): number {
		return Math.atan2(this.y, this.x);
	}

	copy(): Vector2d {
		return new Vector2d(this.x, this.y);
	}

	set(x: number, y: number): this {
		this.x = x;
		this.y = y;
		return this;
	}

	setVector2d(v: VectorLike): this {
		this.x = v.x;
		this.y = v.y;
		return this;
	}

	add(v: VectorLike): Vector2d {
		return new Vector2d(this.x + v.x, this.y + v.y);
	}

	iadd(v: VectorLike): this {
		this.x += v.x;
		this.y += v.y;
		return this;
	}

	sub(v: VectorLike): Vector2d {
		return new Vector2d(this.x - v.x, this.y - v.y);
	}

	isub(v: VectorLike): this {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	}

	mul(v: VectorLike): Vector2d {
		return new Vector2d(this.x * v.x, this.y * v.y);
	}

	imul(v: VectorLike): this {
		this.x *= v.x;
		this.y *= v.y;
		return this;
	}

	div(v: VectorLike): Vector2d {
		return new Vector2d(this.x / v.x, this.y / v.y);
	}

	idiv(v: VectorLike): this {
		this.x /= v.x;
		this.y /= v.y;
		return this;
	}

	scale(scalar: number): Vector2d {
		return new Vector2d(this.x * scalar, this.y * scalar);
	}

	iscale(scalar: number): this {
		this.x *= scalar;
		this.y *= scalar;
		return this;
	}

	scaleX(scalar: number): Vector2d {
		return new Vector2d(this.x * scalar, this.y);
	}

	scaleY(scalar: number): Vector2d {
		return new Vector2d(this.x, this.y * scalar);
	}

	iscaleX(scalar: number): this {
		this.x *= scalar;
		return this;
	}

	iscaleY(scalar: number): this {
		this.y *= scalar;
		return this;
	}

	lerp(v: VectorLike, t: number): Vector2d {
		const other = Vector2d.fromObject(v);
		if (!other) return this.copy();
		return this.add(other.sub(this).scale(t));
	}

	interpolate(v: VectorLike, t: number): Vector2d {
		return this.lerp(v, t);
	}

	iinterpolate(v: VectorLike, t: number): this {
		const other = Vector2d.fromObject(v);
		if (!other) return this;
		return this.iadd(other.sub(this).scale(t));
	}

	dot(v: VectorLike): number {
		return this.x * v.x + this.y * v.y;
	}

	cross(v: VectorLike): number {
		return this.x * v.y - this.y * v.x;
	}

	distance(v: VectorLike): number {
		return this.sub(v).length;
	}

	distanceSquared(v: VectorLike): number {
		return this.sub(v).squaredLength;
	}

	rotate(angle: number): Vector2d {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		return new Vector2d(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
	}

	irotate(angle: number): this {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const x = this.x * cos - this.y * sin;
		const y = this.x * sin + this.y * cos;
		this.x = x;
		this.y = y;
		return this;
	}

	addX(value: number): Vector2d {
		return new Vector2d(this.x + value, this.y);
	}

	addY(value: number): Vector2d {
		return new Vector2d(this.x, this.y + value);
	}

	equals(v: VectorLike): boolean {
		return this.x === v.x && this.y === v.y;
	}

	map(fn: (value: number) => number): Vector2d {
		return new Vector2d(fn(this.x), fn(this.y));
	}

	min(): number {
		return Math.min(this.x, this.y);
	}

	max(): number {
		return Math.max(this.x, this.y);
	}

	round(): Vector2d {
		return new Vector2d(Math.round(this.x), Math.round(this.y));
	}

	iround(): this {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	}

	clampX(values: readonly number[], maxDelta: number): Vector2d {
		const next = this.copy();
		for (const value of values) {
			if (Math.abs(next.x - value) <= maxDelta) next.x = value;
		}
		return next;
	}

	clampY(values: readonly number[], maxDelta: number): Vector2d {
		const next = this.copy();
		for (const value of values) {
			if (Math.abs(next.y - value) <= maxDelta) next.y = value;
		}
		return next;
	}

	angleTo(v: VectorLike): number {
		return Math.atan2(v.y - this.y, v.x - this.x);
	}

	toString(): string {
		return `${this.x}, ${this.y}`;
	}
}

/** Compute the intersection of two finite line segments, if there is one. */
export function calcLineIntersection(
	s1: VectorLike,
	e1: VectorLike,
	s2: VectorLike,
	e2: VectorLike
): Vector2d | null {
	const denominator = (e2.y - s2.y) * (e1.x - s1.x) - (e2.x - s2.x) * (e1.y - s1.y);
	if (denominator === 0) return null;

	const ua = ((e2.x - s2.x) * (s1.y - s2.y) - (e2.y - s2.y) * (s1.x - s2.x)) / denominator;
	const ub = ((e1.x - s1.x) * (s1.y - s2.y) - (e1.y - s1.y) * (s1.x - s2.x)) / denominator;

	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;
	return new Vector2d(s1.x + ua * (e1.x - s1.x), s1.y + ua * (e1.y - s1.y));
}

export function calcAveragePos(vectors: readonly VectorLike[]): Vector2d {
	return vectors
		.reduce<Vector2d>((sum, vector) => sum.add(vector), new Vector2d())
		.scale(1 / vectors.length);
}

/** Normalize an angle to the interval [0, 2π). */
export function normalizeAngle(angle: number): number {
	const twoPi = Math.PI * 2;
	return ((angle % twoPi) + twoPi) % twoPi;
}
