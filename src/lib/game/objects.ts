import { Sprite } from './sprites';
import { Vector2d, type VectorLike } from './vector';
import type { GameState } from './gamestate';

export const golfObjectType = {
	Start: 'Start',
	Hole: 'Hole',
	Lava: 'Lava',
	Cannon: 'Cannon',
	Eraser: 'Eraser',
	DuellHole1: 'Hole 1',
	DuellHole2: 'Hole 2',
	CustomWall: 'Extra Wall',
	GravityBox: 'Gravity Box'
} as const;

export type GolfObjectType = (typeof golfObjectType)[keyof typeof golfObjectType];

export const golfObjectTypeSpriteMap: Record<GolfObjectType, string> = {
	[golfObjectType.Start]: Sprite.Start,
	[golfObjectType.Hole]: Sprite.Hole,
	[golfObjectType.Lava]: Sprite.Lava,
	[golfObjectType.Cannon]: Sprite.Cannon,
	[golfObjectType.Eraser]: Sprite.Eraser,
	[golfObjectType.DuellHole1]: Sprite.DuellHole1,
	[golfObjectType.DuellHole2]: Sprite.DuellHole2,
	[golfObjectType.CustomWall]: Sprite.CustomWall,
	[golfObjectType.GravityBox]: Sprite.GravityBox
};

export interface GolfObjectObject {
	t: GolfObjectType;
	p: VectorLike;
	s: VectorLike;
	a: number;
	u: string;
	r: boolean;
}

/**
 * Older level files (e.g. in the "grass" pack) store objects with the long
 * key names. The legacy implementation accepted both forms, so we do too.
 */
export interface LegacyGolfObjectObject {
	type?: GolfObjectType;
	pos?: VectorLike;
	size?: VectorLike;
	angle?: number;
	uid?: string;
	resizable?: boolean;
}

export type ObjectVisibility = (state: GameState) => boolean;

export class GolfObject {
	type: GolfObjectType;
	pos: Vector2d;
	size: Vector2d;
	angle: number;
	uid: string;
	resizable: boolean;
	visibility: ObjectVisibility = () => true;

	static makeRandomUid(): string {
		return Math.random().toString().slice(2);
	}

	constructor(
		type: GolfObjectType,
		pos = new Vector2d(),
		size = new Vector2d(40, 40),
		angle = 0,
		uid = GolfObject.makeRandomUid(),
		resizable = false
	) {
		this.type = type;
		this.pos = pos;
		this.size = size;
		this.angle = angle;
		this.uid = uid;
		this.resizable = resizable;
	}

	static fromObject(obj: GolfObjectObject | LegacyGolfObjectObject): GolfObject {
		const compact = obj as Partial<GolfObjectObject> & LegacyGolfObjectObject;
		return new GolfObject(
			(compact.t ?? compact.type) as GolfObjectType,
			Vector2d.fromObject(compact.p ?? compact.pos) ?? new Vector2d(),
			Vector2d.fromObject(compact.s ?? compact.size) ?? new Vector2d(40, 40),
			compact.a ?? compact.angle ?? 0,
			compact.u ?? compact.uid ?? GolfObject.makeRandomUid(),
			compact.r ?? compact.resizable ?? false
		);
	}

	static makeDefault(type: GolfObjectType): GolfObject {
		const object = defaultObjects[type].copy();
		object.uid = GolfObject.makeRandomUid();
		return object;
	}

	toObject(): GolfObjectObject {
		return {
			t: this.type,
			p: this.pos.toObject(),
			s: this.size.toObject(),
			a: this.angle,
			u: this.uid,
			r: this.resizable
		};
	}

	setPos(pos: Vector2d): this {
		this.pos = pos;
		return this;
	}

	setSize(size: Vector2d): this {
		this.size = size;
		return this;
	}

	setAngle(angle: number): this {
		this.angle = angle;
		return this;
	}

	setResizable(value: boolean): this {
		this.resizable = value;
		return this;
	}

	setVisibility(visibility: ObjectVisibility): this {
		this.visibility = visibility;
		return this;
	}

	get topLeftPos(): Vector2d {
		return this.pos.sub(this.size.scale(0.5).rotate(this.angle));
	}

	get relativeCorners(): Vector2d[] {
		const halfSize = this.size.scale(0.5);
		return [halfSize.scale(-1), halfSize.scaleY(-1), halfSize, halfSize.scaleX(-1)].map((vector) =>
			vector.rotate(this.angle)
		);
	}

	get corners(): Vector2d[] {
		return this.relativeCorners.map((corner) => corner.add(this.pos));
	}

	get walls(): Array<[Vector2d, Vector2d]> {
		const corners = this.corners;
		return [
			[corners[0], corners[1]],
			[corners[1], corners[2]],
			[corners[2], corners[3]],
			[corners[3], corners[0]]
		];
	}

	get dragCorner(): Vector2d {
		return this.getInnerCorners(-10)[0];
	}

	get radius(): number {
		return this.topLeftPos.distance(this.pos);
	}

	set radius(newRadius: number) {
		this.size = this.size.normalized.scale(newRadius * 2);
	}

	get sprite(): string {
		return golfObjectTypeSpriteMap[this.type];
	}

	get nameKey(): string {
		return `object.${this.type.replaceAll(' ', '-')}.name`;
	}

	get descriptionKey(): string {
		return `object.${this.type.replaceAll(' ', '-')}.description`;
	}

	getInnerCorners(innerCornerDistance: number): Vector2d[] {
		const corners = this.corners;
		const innerCorners: Vector2d[] = [];
		for (let i = 0; i < corners.length; i++) {
			const previousCorner = corners[i > 0 ? i - 1 : corners.length - 1];
			const currentCorner = corners[i];
			const nextCorner = corners[(i + 1) % corners.length];
			const previousDirection = previousCorner.sub(currentCorner).normalized;
			const nextDirection = nextCorner.sub(currentCorner).normalized;
			const innerDirection = previousDirection.add(nextDirection).normalized;
			innerCorners.push(currentCorner.add(innerDirection.scale(innerCornerDistance)));
		}
		return innerCorners;
	}

	intersects(point: VectorLike): boolean {
		const topLeft = this.topLeftPos.rotate(-this.angle);
		const rotatedPoint =
			point instanceof Vector2d
				? point.rotate(-this.angle)
				: new Vector2d(point.x, point.y).rotate(-this.angle);
		return (
			topLeft.x <= rotatedPoint.x &&
			rotatedPoint.x <= topLeft.x + this.size.x &&
			topLeft.y <= rotatedPoint.y &&
			rotatedPoint.y <= topLeft.y + this.size.y
		);
	}

	translate(point: VectorLike): void {
		this.pos.iadd(point);
	}

	rotate(angle: number): void {
		this.pos.irotate(angle);
		this.angle += angle;
	}

	scale(scalar: number): void {
		this.pos.iscale(scalar);
		this.size.iscale(scalar);
	}

	copy(): GolfObject {
		return GolfObject.fromObject(this.toObject());
	}
}

export const placableObjects: GolfObject[] = [
	new GolfObject(golfObjectType.Start),
	new GolfObject(golfObjectType.Hole).setVisibility((state) => state.mode !== 'duell'),
	new GolfObject(golfObjectType.Lava).setSize(new Vector2d(80, 80)).setResizable(true),
	new GolfObject(golfObjectType.Cannon).setSize(new Vector2d(80, 80)),
	new GolfObject(golfObjectType.CustomWall).setSize(new Vector2d(120, 40)).setResizable(true),
	new GolfObject(golfObjectType.GravityBox).setSize(new Vector2d(80, 80)).setResizable(true),
	new GolfObject(golfObjectType.DuellHole1).setVisibility((state) => state.mode === 'duell'),
	new GolfObject(golfObjectType.DuellHole2).setVisibility((state) => state.mode === 'duell'),
	new GolfObject(golfObjectType.Eraser)
];

export const defaultObjects: Record<GolfObjectType, GolfObject> = {
	[golfObjectType.Start]: placableObjects[0],
	[golfObjectType.Hole]: placableObjects[1],
	[golfObjectType.Lava]: placableObjects[2],
	[golfObjectType.Cannon]: placableObjects[3],
	[golfObjectType.CustomWall]: placableObjects[4],
	[golfObjectType.GravityBox]: placableObjects[5],
	[golfObjectType.DuellHole1]: placableObjects[6],
	[golfObjectType.DuellHole2]: placableObjects[7],
	[golfObjectType.Eraser]: placableObjects[8]
};

/** Used by the editor's object picker. */
export const editorObjectTypes = placableObjects
	.filter((object) => object.type !== golfObjectType.Eraser)
	.map((object) => object.type);
