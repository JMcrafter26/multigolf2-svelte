import { calcLineIntersection, Vector2d, type VectorLike } from './vector';

export interface ConstructionLineObject {
	start: VectorLike;
	end: VectorLike;
}

export class ConstructionLine {
	constructor(
		public startPos: Vector2d,
		public endPos: Vector2d
	) {}

	get start(): Vector2d {
		return this.startPos;
	}

	get end(): Vector2d {
		return this.endPos;
	}

	static fromObject(obj: ConstructionLineObject): ConstructionLine {
		return new ConstructionLine(
			Vector2d.fromObject(obj.start) ?? new Vector2d(),
			Vector2d.fromObject(obj.end) ?? new Vector2d()
		);
	}

	toObject(): ConstructionLineObject {
		return { start: this.startPos.toObject(), end: this.endPos.toObject() };
	}
}

export interface PhoneCoordinatesObject {
	coords: [VectorLike, VectorLike, VectorLike, VectorLike];
	angle: number;
	scalar: number;
	gravity: VectorLike;
}

export class PhoneCoordinates {
	angle: number;
	scalar: number;
	gravity: Vector2d;

	constructor(
		public topLeft: Vector2d,
		public topRight: Vector2d,
		public bottomLeft: Vector2d,
		public bottomRight: Vector2d,
		angle = 0,
		scalar = 1,
		gravity = new Vector2d()
	) {
		this.angle = angle;
		this.scalar = scalar;
		this.gravity = gravity;
	}

	static fromWidthHeight(width: number, height: number): PhoneCoordinates {
		return new PhoneCoordinates(
			new Vector2d(0, 0),
			new Vector2d(width, 0),
			new Vector2d(0, height),
			new Vector2d(width, height),
			0,
			1,
			new Vector2d(0, 0)
		);
	}

	static fromObject(obj: PhoneCoordinatesObject): PhoneCoordinates {
		const [topLeft, topRight, bottomLeft, bottomRight] = obj.coords;
		return new PhoneCoordinates(
			Vector2d.fromObject(topLeft) ?? new Vector2d(),
			Vector2d.fromObject(topRight) ?? new Vector2d(),
			Vector2d.fromObject(bottomLeft) ?? new Vector2d(),
			Vector2d.fromObject(bottomRight) ?? new Vector2d(),
			obj.angle ?? 0,
			obj.scalar ?? 1,
			Vector2d.fromObject(obj.gravity) ?? new Vector2d()
		);
	}

	toObject(): PhoneCoordinatesObject {
		return {
			coords: [
				this.topLeft.toObject(),
				this.topRight.toObject(),
				this.bottomLeft.toObject(),
				this.bottomRight.toObject()
			],
			angle: this.angle,
			scalar: this.scalar,
			gravity: this.gravity.toObject()
		};
	}

	get points(): [Vector2d, Vector2d, Vector2d, Vector2d] {
		return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft];
	}

	get midPos(): Vector2d {
		return this.topLeft.add(this.bottomRight).scale(0.5);
	}

	get width(): number {
		const rotated1 = this.topLeft.rotate(-this.angle);
		const rotated2 = this.topRight.rotate(-this.angle);
		return rotated2.x - rotated1.x;
	}

	get height(): number {
		const rotated1 = this.topLeft.rotate(-this.angle);
		const rotated2 = this.bottomLeft.rotate(-this.angle);
		return rotated2.y - rotated1.y;
	}

	get area(): number {
		return Math.abs(this.size.x * this.size.y);
	}

	get size(): Vector2d {
		return this.maxXY.sub(this.minXY);
	}

	get minXY(): Vector2d {
		return new Vector2d(
			Math.min(this.topLeft.x, this.bottomRight.x),
			Math.min(this.topLeft.y, this.bottomRight.y)
		);
	}

	get maxXY(): Vector2d {
		return new Vector2d(
			Math.max(this.topLeft.x, this.bottomRight.x),
			Math.max(this.topLeft.y, this.bottomRight.y)
		);
	}

	get minXmaxY(): Vector2d {
		return new Vector2d(
			Math.min(this.topLeft.x, this.bottomRight.x),
			Math.max(this.topLeft.y, this.bottomRight.y)
		);
	}

	get maxXminY(): Vector2d {
		return new Vector2d(
			Math.max(this.topLeft.x, this.bottomRight.x),
			Math.min(this.topLeft.y, this.bottomRight.y)
		);
	}

	get walls(): Array<[Vector2d, Vector2d]> {
		const p = this.points;
		return [
			[p[0], p[1]],
			[p[1], p[2]],
			[p[2], p[3]],
			[p[3], p[0]]
		];
	}

	get corners(): readonly Vector2d[] {
		return this.points;
	}

	randomPosInside(): Vector2d {
		const x = Math.random();
		const y = Math.random();
		return this.topLeft
			.add(this.topRight.sub(this.topLeft).scale(x))
			.add(this.bottomLeft.sub(this.topLeft).scale(y));
	}

	scale(scalar: number): this {
		this.scalar *= scalar;
		for (const vector of this.points) vector.iscale(scalar);
		return this;
	}

	rotate(angle: number): this {
		this.angle += angle;
		for (const vector of this.points) vector.irotate(angle);
		return this;
	}

	translate(point: VectorLike): this {
		for (const vector of this.points) vector.iadd(point);
		return this;
	}

	copy(): PhoneCoordinates {
		return PhoneCoordinates.fromObject(this.toObject());
	}

	creditCardScalingFactor(screenSize: Vector2d): number {
		return this.height / screenSize.y;
	}

	screenPosToBoardPos(screenPos: Vector2d, screenSize: Vector2d): Vector2d {
		const scaledScreenPos = screenPos.copy();
		scaledScreenPos.iscaleX(this.width / screenSize.x);
		scaledScreenPos.iscaleY(this.height / screenSize.y);
		const pos = scaledScreenPos.rotate(this.angle);
		return this.topLeft.add(pos.scale(this.scalar));
	}

	boardPosToScreenPos(boardPos: Vector2d, screenSize: Vector2d): Vector2d {
		const relativePos = boardPos.sub(this.topLeft).scale(1 / this.scalar);
		const rawScreenPos = relativePos.rotate(-this.angle);
		rawScreenPos.iscaleX(screenSize.x / this.width);
		rawScreenPos.iscaleY(screenSize.y / this.height);
		return rawScreenPos;
	}

	containsPos(pos: VectorLike): boolean {
		const min = this.minXY;
		const max = this.maxXY;
		return pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y;
	}

	distanceToPos(pos: VectorLike): number {
		const min = this.minXY;
		const max = this.maxXY;
		const dx = Math.max(min.x - pos.x, 0, pos.x - max.x);
		const dy = Math.max(min.y - pos.y, 0, pos.y - max.y);
		return Math.hypot(dx, dy);
	}

	hasOverlap(other: PhoneCoordinates): boolean {
		for (const [p1, p2] of this.walls) {
			for (const [p3, p4] of other.walls) {
				if (calcLineIntersection(p1, p2, p3, p4)) return true;
			}
		}
		return false;
	}

	getOverlap(other: PhoneCoordinates): PhoneCoordinates | null {
		const wallIntersections: Vector2d[] = [];
		for (const [p1, p2] of this.walls) {
			for (const [p3, p4] of other.walls) {
				const intersection = calcLineIntersection(p1, p2, p3, p4);
				if (intersection) wallIntersections.push(intersection);
			}
		}

		const epsilon = 0.1;
		const insidePoints = this.points
			.filter((p) => other.distanceToPos(p) < epsilon)
			.concat(other.points.filter((p) => this.distanceToPos(p) < epsilon));

		const uniqueIntersections: Vector2d[] = [];
		for (const point of wallIntersections.concat(insidePoints)) {
			if (!uniqueIntersections.some((otherPoint) => point.distance(otherPoint) < epsilon)) {
				uniqueIntersections.push(point);
			}
		}

		if (uniqueIntersections.length === 4) {
			const minXY = new Vector2d(
				Math.min(...uniqueIntersections.map((p) => p.x)),
				Math.min(...uniqueIntersections.map((p) => p.y))
			);
			const maxXY = new Vector2d(
				Math.max(...uniqueIntersections.map((p) => p.x)),
				Math.max(...uniqueIntersections.map((p) => p.y))
			);
			const size = maxXY.sub(minXY);
			return new PhoneCoordinates(minXY, minXY.addX(size.x), minXY.addY(size.y), maxXY);
		}
		return null;
	}
}

export interface PhoneConnectionLineObject {
	start: VectorLike;
	end: VectorLike;
	color: string;
}

let previousHue: number | null = null;

function randomDistinctColor(): string {
	for (let attempt = 0; attempt < 40; attempt++) {
		const hue = Math.round(Math.random() * 360);
		if (hue > 65 && hue < 185) continue;
		const hueDifference = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
		if (previousHue !== null && hueDifference(hue, previousHue) < 60) continue;
		previousHue = hue;
		return `hsl(${hue}deg 100% 50%)`;
	}
	return 'hsl(0deg 100% 50%)';
}

export class PhoneConnectionLine {
	constructor(
		public start: Vector2d = new Vector2d(0, 0),
		public end: Vector2d = new Vector2d(1, 0),
		color = 'random'
	) {
		this.color = color === 'random' ? randomDistinctColor() : color;
	}

	color: string;

	get length(): number {
		return this.start.distance(this.end);
	}

	get points(): [Vector2d, Vector2d] {
		return [this.start, this.end];
	}

	translate(vector: VectorLike): this {
		this.start.iadd(vector);
		this.end.iadd(vector);
		return this;
	}

	rotate(angle: number): this {
		for (const vector of this.points) vector.irotate(angle);
		return this;
	}

	scale(scalar: number): this {
		for (const vector of this.points) vector.iscale(scalar);
		return this;
	}

	static fromObject(obj: PhoneConnectionLineObject): PhoneConnectionLine {
		return new PhoneConnectionLine(
			Vector2d.fromObject(obj.start) ?? new Vector2d(),
			Vector2d.fromObject(obj.end) ?? new Vector2d(1, 0),
			obj.color
		);
	}

	toObject(): PhoneConnectionLineObject {
		return {
			start: this.start.toObject(),
			end: this.end.toObject(),
			color: this.color
		};
	}
}

export interface CourseObject {
	phones: PhoneCoordinatesObject[];
	lines?: PhoneConnectionLineObject[];
}

export class Course {
	alignOptions: number[] = [];

	constructor(
		public phones: PhoneCoordinates[] = [],
		public lines: PhoneConnectionLine[] = []
	) {}

	static fromObject(obj: CourseObject): Course {
		return new Course(
			obj.phones.map((phone) => PhoneCoordinates.fromObject(phone)),
			obj.lines?.map((line) => PhoneConnectionLine.fromObject(line)) ?? []
		);
	}

	toObject(): CourseObject {
		return {
			phones: this.phones.map((phone) => phone.toObject()),
			lines: this.lines.map((line) => line.toObject())
		};
	}

	copy(): Course {
		return Course.fromObject(this.toObject());
	}

	reset(): void {
		this.phones = [];
		this.lines = [];
		this.alignOptions = [];
	}

	scale(scalar: number): void {
		for (const phone of this.phones) phone.scale(scalar);
		for (const line of this.lines) line.scale(scalar);
	}

	rotate(angle: number): void {
		for (const phone of this.phones) phone.rotate(angle);
		for (const line of this.lines) line.rotate(angle);
	}

	translate(point: VectorLike): void {
		for (const phone of this.phones) phone.translate(point);
		for (const line of this.lines) line.translate(point);
	}

	addPhone(phone: PhoneCoordinates): void {
		this.phones.push(phone);
	}

	addLine(line: PhoneConnectionLine): void {
		this.lines.push(line);
	}

	containsPos(pos: VectorLike): boolean {
		return this.phones.some((phone) => phone.containsPos(pos));
	}

	getOverlaps(): PhoneCoordinates[] {
		const overlaps: PhoneCoordinates[] = [];
		for (let i = 0; i < this.phones.length; i++) {
			for (let j = i + 1; j < this.phones.length; j++) {
				const overlap = this.phones[i].getOverlap(this.phones[j]);
				if (overlap) overlaps.push(overlap);
			}
		}
		return overlaps;
	}
}
