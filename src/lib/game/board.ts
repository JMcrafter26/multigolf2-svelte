import { Ball, type BallObject } from './ball';
import { BoardStyling } from './board-styling';
import { silentEffects, type GameEffects } from './effects';
import { golfObjectType, GolfObject, type GolfObjectObject } from './objects';
import { Particle, type ParticleObject } from './particle';
import {
	ConstructionLine,
	Course,
	PhoneConnectionLine,
	PhoneCoordinates,
	type CourseObject
} from './phone-coordinates';
import { AllBallSprites } from './sprites';
import { Vector2d, type VectorLike } from './vector';

export interface BoardObject {
	course: CourseObject;
	objects: GolfObjectObject[];
	balls: BallObject[];
	physicsTime: number;
	ballCollisionEnabled: boolean;
	deviceGravityEnabled: boolean;
	particlesEnabled: boolean;
	particles: ParticleObject[];
}

export interface ParticleExplosionOptions {
	color?: string;
	forceSpeed?: number;
	numParticles?: number;
	radius?: number;
}

export interface ConstructionLineEntry {
	line: ConstructionLine;
	phone: PhoneCoordinates;
	timestamp: number;
	deviceIndex: number;
}

type PhysicsEvent = [stepIndex: number, callback: () => void];

export class Board {
	static physicsTimestep = 17;

	course: Course;
	objects: GolfObject[];
	balls: Ball[];
	particles: Particle[];
	physicsTime: number;
	styling: BoardStyling;
	ballCollisionEnabled: boolean;
	deviceGravityEnabled: boolean;
	particlesEnabled: boolean;
	effects: GameEffects;

	// Host-only state. These fields are deliberately not serialized.
	constructionLineBuffer: ConstructionLineEntry[] = [];
	courseHistory: Course[];
	physicsStepCount = 0;
	physicsStepEvents: PhysicsEvent[] = [];

	constructor(
		course?: Course,
		objects?: GolfObject[],
		balls?: Ball[],
		physicsTime?: number,
		ballCollisionEnabled?: boolean,
		deviceGravityEnabled?: boolean,
		particlesEnabled?: boolean,
		particles?: Particle[],
		styling?: BoardStyling,
		effects?: GameEffects
	) {
		this.course = course ?? new Course();
		this.objects = objects ?? [];
		this.balls = balls ?? [];
		this.particles = particles ?? [];
		this.physicsTime = physicsTime ?? Date.now();
		this.styling = styling ?? new BoardStyling();

		this.ballCollisionEnabled = ballCollisionEnabled ?? true;
		this.deviceGravityEnabled = deviceGravityEnabled ?? true;
		this.particlesEnabled = particlesEnabled ?? true;
		this.effects = effects ?? silentEffects;

		this.courseHistory = [this.course.copy()];
		for (const ball of this.balls) ball.effects = this.effects;
	}

	static fromObject(obj: BoardObject, effects?: GameEffects): Board {
		return new Board(
			Course.fromObject(obj.course),
			obj.objects.map((object) => GolfObject.fromObject(object)),
			obj.balls.map((ball) => Ball.fromObject(ball)),
			obj.physicsTime,
			obj.ballCollisionEnabled,
			obj.deviceGravityEnabled,
			obj.particlesEnabled,
			obj.particles?.map((particle) => Particle.fromObject(particle)),
			undefined,
			effects
		);
	}

	toObject(): BoardObject {
		return {
			course: this.course.toObject(),
			objects: this.objects.map((object) => object.toObject()),
			balls: this.balls.map((ball) => ball.toObject()),
			physicsTime: this.physicsTime,
			ballCollisionEnabled: this.ballCollisionEnabled,
			deviceGravityEnabled: this.deviceGravityEnabled,
			particlesEnabled: this.particlesEnabled,
			particles: this.particles.map((particle) => particle.toObject())
		};
	}

	copy(): Board {
		return Board.fromObject(this.toObject(), this.effects);
	}

	resetConfig(): void {
		this.balls = [];
		this.objects = [];
		this.course.reset();
		this.courseHistory = [this.course.copy()];
	}

	addPhysicsEvent(callback: () => void, relativeStepIndex: number): void {
		this.physicsStepEvents.push([this.physicsStepCount + relativeStepIndex, callback]);
	}

	spawnParticleExplosion(
		pos: Vector2d,
		{ color, forceSpeed, numParticles = 50, radius }: ParticleExplosionOptions = {}
	): void {
		if (!this.particlesEnabled) return;

		const plusminus = Math.ceil(numParticles * 0.3);
		numParticles += Math.round((Math.random() - 0.5) * 2 * plusminus);
		const angleStep = (1 / numParticles) * Math.PI * 2;

		for (let i = 0; i < numParticles; i++) {
			let speed = forceSpeed ?? 2;
			speed *= 0.7 + Math.random() * 0.6;
			const angle = (i + Math.random()) * angleStep;
			const vel = Vector2d.fromAngle(angle).scale(speed);
			this.particles.push(new Particle(pos.copy(), vel, color, radius));
		}
	}

	clearPhysicsEvents(): void {
		this.physicsStepEvents.length = 0;
	}

	get movableThings(): Array<GolfObject | Ball | Course> {
		return [...this.objects, ...this.balls, this.course];
	}

	translate(point: VectorLike): void {
		for (const thing of this.movableThings) thing.translate(point);
	}

	rotate(angle: number): void {
		for (const thing of this.movableThings) thing.rotate(angle);
	}

	scale(scalar: number): void {
		for (const thing of this.movableThings) thing.scale(scalar);
	}

	/** Replace an object by uid. Returns whether an object was found. */
	updateObject(object: GolfObject): boolean {
		const index = this.objects.findIndex((candidate) => candidate.uid === object.uid);
		if (index === -1) return false;
		this.objects[index] = object;
		return true;
	}

	getClosestObject(pos: Vector2d): GolfObject | null {
		let smallestDistance = Infinity;
		let closestObject: GolfObject | null = null;
		for (const object of this.objects) {
			const distance = pos.distance(object.pos);
			if (distance < smallestDistance) {
				smallestDistance = distance;
				closestObject = object;
			}
		}
		return closestObject;
	}

	/** Iterate backwards because of drawing order. */
	intersectObject(pos: VectorLike): GolfObject | null {
		for (let i = this.objects.length - 1; i >= 0; i--) {
			if (this.objects[i].intersects(pos)) return this.objects[i];
		}
		return null;
	}

	get startPos(): Vector2d | undefined {
		return this.objects.find((object) => object.type === golfObjectType.Start)?.pos;
	}

	get endPositions(): Vector2d[] {
		return this.objects
			.filter(
				(object) =>
					object.type === golfObjectType.Hole ||
					object.type === golfObjectType.DuellHole1 ||
					object.type === golfObjectType.DuellHole2
			)
			.map((object) => object.pos);
	}

	updateObjectPhysics(): void {
		for (const object of this.objects) {
			if (object.type === golfObjectType.Cannon) object.angle += Math.PI / 140;
		}
	}

	physicsStep(): void {
		for (const ball of this.balls) ball.updatePhysics(this);
		for (const particle of this.particles) particle.updatePhysics(this);

		this.updateObjectPhysics();
		this.particles = this.particles.filter((particle) => particle.alive);
		this.physicsTime += Board.physicsTimestep;
	}

	runScheduledPhysicsEvents(): void {
		for (const [eventIndex, callback] of this.physicsStepEvents) {
			if (eventIndex === this.physicsStepCount) callback();
		}
		this.physicsStepEvents = this.physicsStepEvents.filter(
			([index]) => index > this.physicsStepCount
		);
	}

	updatePhysics(maxTime = Date.now(), maxSteps = 500): void {
		let stepCount = 0;
		while (stepCount < maxSteps && this.physicsTime < maxTime) {
			this.physicsStep();
			this.physicsStepCount++;
			stepCount++;
			this.runScheduledPhysicsEvents();
		}

		// If the host tab was suspended for a long time, don't make all clients
		// sit through minutes of catch-up simulation.
		if (Math.abs(this.physicsTime - maxTime) > 10_000) this.physicsTime = maxTime;
	}

	simulateStepsEfficiently(numSteps: number, { disableParticles = true } = {}): void {
		const previousParticlesEnabled = this.particlesEnabled;
		if (disableParticles) this.particlesEnabled = false;

		for (let i = 0; i < numSteps; i++) {
			this.physicsStep();
			this.physicsStepCount++;
			this.runScheduledPhysicsEvents();
		}

		this.particlesEnabled = previousParticlesEnabled;
	}

	spawnBall({ spriteUrl = 'random' }: { spriteUrl?: string } = {}): Ball {
		if (!this.startPos) throw new Error('startPos must be set before spawning a ball');
		const resolvedSprite =
			spriteUrl === 'random'
				? AllBallSprites[Math.floor(Math.random() * AllBallSprites.length)]
				: spriteUrl;

		const ball = new Ball(this.startPos.copy(), new Vector2d(), false, 18, resolvedSprite, 0, true);
		ball.effects = this.effects;
		this.balls.push(ball);
		return ball;
	}

	addConstructionLine(
		line: ConstructionLine,
		phone: PhoneCoordinates,
		timestamp: number,
		deviceIndex: number
	): void {
		this.constructionLineBuffer.push({ line, phone, timestamp, deviceIndex });
		this.parseConstructionLines();
	}

	get currPhoneIndex(): number {
		return Math.max(1, this.course.phones.length);
	}

	parseConstructionLines(): void {
		this.constructionLineBuffer = this.constructionLineBuffer.filter(
			(entry) => Date.now() - entry.timestamp < 2500
		);
		if (this.constructionLineBuffer.length < 2) return;

		const removeIndices = new Set<number>();
		for (let i = 0; i + 1 < this.constructionLineBuffer.length; i++) {
			let a = this.constructionLineBuffer[i];
			let b = this.constructionLineBuffer[i + 1];
			if (a.deviceIndex > b.deviceIndex) [a, b] = [b, a];
			if (!this.connectTwoConstructionLines(a, b)) removeIndices.add(i);
		}

		this.constructionLineBuffer = this.constructionLineBuffer.filter(
			(_, index) => !removeIndices.has(index)
		);
	}

	connectTwoConstructionLines(a: ConstructionLineEntry, b: ConstructionLineEntry): boolean {
		if (a.deviceIndex > this.currPhoneIndex || a.deviceIndex === b.deviceIndex) return false;

		if (a.deviceIndex < this.currPhoneIndex) {
			// Rebuild the course from the point the new line connects to.
			while (this.course.phones.length > a.deviceIndex && this.courseHistory.length > 1) {
				this.courseHistory.pop();
				this.course = this.courseHistory[this.courseHistory.length - 1].copy();
			}
		}

		if (this.course.phones.length === 0) {
			this.course = new Course([a.phone.copy()]);
			this.courseHistory.push(this.course.copy());
		}

		const deltaA = a.line.endPos.sub(a.line.startPos);
		const deltaB = b.line.endPos.sub(b.line.startPos);
		if (deltaA.length === 0 || deltaB.length === 0) return false;

		const originA = a.line.startPos.copy();
		const originB = b.line.startPos.copy();

		this.course.scale(deltaB.length / deltaA.length);
		originA.iscale(deltaB.length / deltaA.length);
		this.course.rotate(deltaB.angle - deltaA.angle);
		originA.irotate(deltaB.angle - deltaA.angle);
		this.course.translate(originB.sub(originA));
		this.course.addPhone(b.phone.copy());
		this.course.addLine(new PhoneConnectionLine(b.line.startPos, b.line.endPos));
		this.courseHistory.push(this.course.copy());
		return true;
	}
}
