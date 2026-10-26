import { AudioSprite } from './sprites';
import { silentEffects, type GameEffects } from './effects';
import { golfObjectType, type GolfObject } from './objects';
import type { PhoneCoordinates } from './phone-coordinates';
import { Particle } from './particle';
import { Vector2d, type VectorLike } from './vector';
import type { Board } from './board';

export interface BallObject {
	p: VectorLike;
	v: VectorLike;
	i: boolean;
	r: number;
	s: string;
	k: number;
	a: boolean;
	u: string;
	ro: number;
	l: VectorLike;
	im: number;
	o: Array<[string, Array<[string, number]>]>;
	g: boolean;
}

type ObjectMemory = Map<string, Map<string, number>>;

function objectMemoryFromObject(serialized: BallObject['o'] | undefined): ObjectMemory {
	if (!serialized) return new Map();
	return new Map(serialized.map(([objectUid, entries]) => [objectUid, new Map(entries)]));
}

export class Ball {
	pos: Vector2d;
	vel: Vector2d;
	inHole: boolean;
	radius: number;
	spriteUrl: string;
	kicks: number;
	active: boolean;
	uid: string;
	rotationAngle: number;
	lastImmobilePos: Vector2d;
	immobileTickCount: number;
	objectMemory: ObjectMemory;
	generallyAbleToCollide: boolean;
	effects: GameEffects = silentEffects;

	// runtime-only state
	outOfBoundsTickCount = 0;
	movingTickCount = 0;
	private objectInteractedFlag = false;

	constructor(
		pos: Vector2d,
		vel = new Vector2d(),
		inHole = false,
		radius = 18,
		spriteUrl: string,
		kicks = 0,
		active = true,
		uid = Ball.makeUid(),
		rotationAngle = 0,
		lastImmobilePos?: Vector2d,
		immobileTickCount = 0,
		objectMemory: ObjectMemory = new Map(),
		generallyAbleToCollide = true
	) {
		this.pos = pos;
		this.vel = vel;
		this.inHole = inHole;
		this.radius = radius;
		this.spriteUrl = spriteUrl;
		this.kicks = kicks;
		this.active = active;
		this.uid = uid;
		this.rotationAngle = rotationAngle;
		this.lastImmobilePos = lastImmobilePos ?? this.pos.copy();
		this.immobileTickCount = immobileTickCount;
		this.objectMemory = objectMemory;
		this.generallyAbleToCollide = generallyAbleToCollide;
	}

	static makeUid(): string {
		return Math.random().toString().slice(2);
	}

	static fromObject(obj: BallObject): Ball {
		return new Ball(
			Vector2d.fromObject(obj.p) ?? new Vector2d(),
			Vector2d.fromObject(obj.v) ?? new Vector2d(),
			obj.i ?? false,
			obj.r ?? 18,
			obj.s,
			obj.k ?? 0,
			obj.a ?? true,
			obj.u ?? Ball.makeUid(),
			obj.ro ?? 0,
			Vector2d.fromObject(obj.l) ?? undefined,
			obj.im ?? 0,
			objectMemoryFromObject(obj.o),
			obj.g ?? true
		);
	}

	toObject(): BallObject {
		return {
			p: this.pos.toObject(),
			v: this.vel.toObject(),
			i: this.inHole,
			r: this.radius,
			s: this.spriteUrl,
			k: this.kicks,
			a: this.active,
			u: this.uid,
			ro: this.rotationAngle,
			l: this.lastImmobilePos.toObject(),
			im: this.immobileTickCount,
			o: Array.from(this.objectMemory.entries()).map(([uid, values]) => [
				uid,
				Array.from(values.entries())
			]),
			g: this.generallyAbleToCollide
		};
	}

	/** Reset position without changing score or shot count. */
	resetPos(startPos: Vector2d): void {
		this.pos = startPos.copy();
		this.vel.iscale(0);
		this.rotationAngle = 0;
		this.generallyAbleToCollide = true;
	}

	kick(direction: VectorLike): void {
		if (this.inHole) return;
		this.vel.iadd(new Vector2d(direction.x, direction.y).scale(0.6));
		this.kicks++;
		this.immobileTickCount = 0;
		this.lastImmobilePos = this.pos.copy();
		this.effects.playSound(AudioSprite.Shot);
	}

	isMoving(): boolean {
		return this.vel.length > 0;
	}

	isInMovement(): boolean {
		return this.movingTickCount > 0;
	}

	private static walledObjects(board: Board): Array<PhoneCoordinates | GolfObject> {
		return [
			...board.course.phones,
			...board.objects.filter((object) => object.type === golfObjectType.CustomWall)
		];
	}

	private distanceToWall(p1: Vector2d, p2: Vector2d, point: Vector2d) {
		const p2ToP1 = p2.sub(p1);
		const p2ToPoint = point.sub(p1);
		const d = p2ToP1.dot(p2ToPoint) / p2ToP1.squaredLength;
		if (d < 0) return { distance: p1.distance(point), closestPoint: p1.copy() };
		if (d > 1) return { distance: p2.distance(point), closestPoint: p2.copy() };
		const closestPoint = p1.add(p2ToP1.scale(d));
		return { distance: closestPoint.distance(point), closestPoint };
	}

	private getCollidingCorners(board: Board) {
		const collidingCorners: Array<{
			type: 'corner';
			distance: number;
			point: Vector2d;
		}> = [];

		for (const wallObject of Ball.walledObjects(board)) {
			for (const corner of wallObject.corners) {
				const distance = corner.distance(this.pos);
				if (distance < this.radius) {
					collidingCorners.push({ type: 'corner', distance, point: corner });
				}
			}
		}
		return collidingCorners;
	}

	private getCollidingWalls(board: Board) {
		const collidingWalls: Array<{
			type: 'wall';
			distance: number;
			points: [Vector2d, Vector2d];
		}> = [];
		const epsilon = 0.01;

		for (const wallObject of Ball.walledObjects(board)) {
			for (const [p1, p2] of wallObject.walls) {
				const { distance, closestPoint } = this.distanceToWall(p1, p2, this.pos);
				if (distance > this.radius) continue;

				let overlapCount = 0;
				for (const phone of board.course.phones) {
					if (phone.distanceToPos(closestPoint) < epsilon) {
						overlapCount++;
						if (overlapCount > 1) break;
					}
				}
				if (overlapCount < 2) collidingWalls.push({ type: 'wall', distance, points: [p1, p2] });
			}
		}
		return collidingWalls;
	}

	private getClosestEndPos(board: Board): Vector2d | null {
		let closestPos: Vector2d | null = null;
		let smallestDistance = Infinity;
		for (const endPos of board.endPositions) {
			const distance = endPos.distance(this.pos);
			if (distance < smallestDistance) {
				smallestDistance = distance;
				closestPos = endPos;
			}
		}
		return closestPos?.copy() ?? null;
	}

	private reflectAtWall(p1: Vector2d, p2: Vector2d, direction: Vector2d): Vector2d {
		const wallDirection = p2.sub(p1);
		const wallNormal = new Vector2d(-wallDirection.y, wallDirection.x);
		const angleDifference = direction.angle - wallNormal.angle;
		return direction.rotate(-angleDifference * 2).scale(-1);
	}

	private getIntersectingObjects(board: Board, objectType: string | null = null) {
		return board.objects.filter(
			(object) => object.intersects(this.pos) && (objectType === null || object.type === objectType)
		);
	}

	readyToCollide(board: Board): boolean {
		if (this.inHole || !board.startPos) return false;
		return board.startPos.distance(this.pos) > 2 * this.radius;
	}

	private calcBallCollisions(board: Board): void {
		if (!this.readyToCollide(board) || !this.generallyAbleToCollide) return;

		for (const ball of board.balls) {
			if (ball.uid === this.uid) continue;
			if (!ball.readyToCollide(board) || !ball.generallyAbleToCollide) continue;
			if (ball.pos.distance(this.pos) > ball.radius + this.radius) continue;

			const [v1, v2, x1, x2] = [this.vel, ball.vel, this.pos, ball.pos];
			const v1p = v1.sub(
				x1.sub(x2).scale(v1.sub(v2).dot(x1.sub(x2)) / Math.max(x1.sub(x2).squaredLength, 1e-9))
			);
			const v2p = v2.sub(
				x2.sub(x1).scale(v2.sub(v1).dot(x2.sub(x1)) / Math.max(x2.sub(x1).squaredLength, 1e-9))
			);

			this.vel = v1p;
			ball.vel = v2p;
			this.pos.iadd(this.vel);
			ball.pos.iadd(ball.vel);
			ball.immobileTickCount = 0;
			this.immobileTickCount = 0;
			board.effects.playSound(AudioSprite.Bonk);
		}
	}

	updatePhysics(board: Board): void {
		this.effects = board.effects;
		const stepCount = Math.max(Math.ceil(this.vel.length / 5), 1);
		let isUnderAcceleration = false;

		if (board.deviceGravityEnabled && this.isMoving() && !this.inHole) {
			for (const phone of board.course.phones) {
				if (phone.containsPos(this.pos)) {
					const gravity = phone.gravity.rotate(phone.angle);
					if (gravity.length > 0) {
						this.vel.iadd(gravity);
						isUnderAcceleration = true;
					}
					break;
				}
			}
		}

		if (this.isMoving() && !this.inHole) {
			for (const box of this.getIntersectingObjects(board, golfObjectType.GravityBox)) {
				const gravity = Vector2d.fromAngle(box.angle - Math.PI / 2).scale(0.5);
				this.vel.iadd(gravity);
				isUnderAcceleration = true;
			}
		}

		if (this.isMoving() && this.vel.length < 0.3 && !isUnderAcceleration) {
			this.vel.iscale(0);
		}

		let isActivelyMoving = false;
		this.vel.iscale(0.97);
		this.vel.iscale(1 / stepCount);
		this.objectInteractedFlag = false;
		for (let i = 0; i < stepCount; i++) {
			if (this.physicsStep(board)) isActivelyMoving = true;
		}
		this.vel.iscale(stepCount);

		if (this.pos.distance(this.lastImmobilePos) > this.radius) {
			this.immobileTickCount = 0;
			this.lastImmobilePos = this.pos.copy();
		} else {
			this.immobileTickCount++;
		}

		if (this.immobileTickCount > 60 * 2 && this.isMoving()) {
			this.vel.iscale(0);
		}

		const insideWall = board.objects
			.filter((object) => object.type === golfObjectType.CustomWall)
			.some((object) => object.intersects(this.pos));
		if (!board.course.containsPos(this.pos) || insideWall) {
			this.outOfBoundsTickCount++;
			if (this.outOfBoundsTickCount > 10 && board.startPos) {
				this.resetPos(board.startPos);
				this.outOfBoundsTickCount = 0;
			}
		} else {
			this.outOfBoundsTickCount = 0;
		}

		if (this.isMoving() || isActivelyMoving) {
			this.movingTickCount++;
			if (this.movingTickCount > 60 * 10) this.vel.iscale(0);
		} else {
			this.movingTickCount = 0;
		}
	}

	private interactWithLava(board: Board): void {
		if (this.inHole) return;
		board.effects.playSound(AudioSprite.Lava);
		board.spawnParticleExplosion(this.pos, {
			forceSpeed: this.vel.length,
			color: '#f9480a'
		});
		if (board.startPos) this.resetPos(board.startPos);
	}

	private interactWithCannon(board: Board, object: GolfObject): boolean {
		const objectData = this.getObjectMemory(object.uid);
		const cannonProgress = objectData.get('progress') ?? 0;
		if (!objectData.has('progress')) objectData.set('progress', cannonProgress);

		const shootDirection = Vector2d.fromAngle(object.angle + Math.PI / 2);
		const bellyPos = object.pos.add(shootDirection.scale(-object.size.max() * 0.17));
		const nozzlePos = object.pos.add(shootDirection.scale(object.size.max() * 0.37));
		const desiredPos =
			cannonProgress < 30
				? bellyPos
				: cannonProgress < 100
					? bellyPos.interpolate(nozzlePos, (cannonProgress - 30) / 70)
					: nozzlePos;

		if (cannonProgress > 30 && cannonProgress < 100) this.rotationAngle += 0.05;
		this.rotationAngle += Math.PI / 140;
		this.pos.iinterpolate(desiredPos, Math.min(cannonProgress / 50, 1));
		this.vel.iscale(0);
		this.generallyAbleToCollide = false;

		if (cannonProgress >= 140) {
			this.vel.setVector2d(shootDirection.scale(object.size.max() / 2));
			this.pos.iadd(shootDirection.scale(object.size.max() / 2));
			this.resetObjectMemory(object.uid);

			for (let i = 0; i < 20; i++) {
				const particle = new Particle(nozzlePos.copy());
				particle.vel = shootDirection.scale(10 + Math.random() * 10);
				particle.vel.irotate(Math.random() * 0.4 - 0.2);
				particle.color = 'black';
				board.particles.push(particle);
			}

			board.effects.playSound(AudioSprite.Cannon);
			this.generallyAbleToCollide = true;
		}

		objectData.set('progress', cannonProgress + 1);
		return true;
	}

	private getObjectMemory(objectUid: string): Map<string, number> {
		let objectData = this.objectMemory.get(objectUid);
		if (!objectData) {
			objectData = new Map();
			this.objectMemory.set(objectUid, objectData);
		}
		objectData.set('expire-count', 100);
		return objectData;
	}

	private resetObjectMemory(objectUid: string): void {
		this.objectMemory.delete(objectUid);
	}

	private updateObjectMemories(): void {
		for (const [objectUid, objectData] of this.objectMemory.entries()) {
			const count = objectData.get('expire-count');
			if (count === undefined) continue;
			objectData.set('expire-count', count - 1);
			if (count <= 1) this.objectMemory.delete(objectUid);
		}
	}

	private interactStepWithObject(board: Board, object: GolfObject): boolean {
		if (this.objectInteractedFlag) return false;
		this.objectInteractedFlag = true;
		switch (object.type) {
			case golfObjectType.Lava:
				this.interactWithLava(board);
				return false;
			case golfObjectType.Cannon:
				return this.interactWithCannon(board, object);
			default:
				this.objectInteractedFlag = false;
				return false;
		}
	}

	private physicsStep(board: Board): boolean {
		let madeWallCollision = false;
		let isActivelyMoving = false;

		this.pos.iadd(this.vel);

		for (const object of board.objects.filter((candidate) => candidate.intersects(this.pos))) {
			if (this.interactStepWithObject(board, object)) isActivelyMoving = true;
		}
		this.updateObjectMemories();

		type CornerCollision = { type: 'corner'; distance: number; point: Vector2d };
		type WallCollision = { type: 'wall'; distance: number; points: [Vector2d, Vector2d] };
		const collidingObjects: Array<CornerCollision | WallCollision> = [
			...this.getCollidingCorners(board),
			...this.getCollidingWalls(board)
		].sort((a, b) => a.distance - b.distance);

		if (collidingObjects.length > 0 && this.generallyAbleToCollide) {
			const closest = collidingObjects[0];
			if (closest.type === 'corner') {
				const collidingCorner = closest.point;
				const cornerDirection = this.pos.sub(collidingCorner);
				const collisionStrength =
					(-2 * this.vel.dot(cornerDirection)) / Math.max(cornerDirection.squaredLength, 1e-9);
				this.pos.isub(this.vel);
				this.vel.iadd(cornerDirection.scale(collisionStrength));
				this.pos.iadd(this.vel.scale(0.95));
			} else {
				for (const [p1, p2] of collidingObjects
					.filter((object): object is WallCollision => object.type === 'wall')
					.map((object) => object.points)) {
					this.pos.isub(this.vel);
					this.vel = this.reflectAtWall(p1, p2, this.vel);
					this.pos.iadd(this.vel.scale(0.8));
				}
			}
			madeWallCollision = true;
		}

		if (board.ballCollisionEnabled) this.calcBallCollisions(board);

		const endPos = this.getClosestEndPos(board);
		if (endPos && !this.inHole) {
			const distance = endPos.distance(this.pos);
			if (distance <= this.radius * 1.35 && this.vel.length < 40) {
				this.inHole = true;
				board.effects.playSound(AudioSprite.WinSound);
			}
		}

		if (this.inHole && endPos) {
			this.radius = Math.max(0, this.radius - 0.13);
			this.pos = this.pos.lerp(endPos, 0.1);
			this.rotationAngle += 0.4;
			this.vel.iscale(0.8);
		} else {
			this.rotationAngle += this.vel.length / 40;
		}

		if (madeWallCollision) {
			board.effects.randomNote({ volume: Math.min((this.vel.length / 10) * 0.9 + 0.1, 1) });
		}

		return isActivelyMoving;
	}

	translate(point: VectorLike): void {
		this.pos.iadd(point);
	}

	scale(scalar: number): void {
		this.radius *= scalar;
		this.pos.iscale(scalar);
	}

	rotate(angle: number): void {
		this.pos.irotate(angle);
		this.rotationAngle += angle;
	}
}
