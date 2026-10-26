import { Vector2d, type VectorLike } from './vector';
import type { Board } from './board';

export const PARTICLE_MAX_TICKS = 30;

export interface ParticleObject {
	p: VectorLike;
	v: VectorLike;
	c: string;
	r: number;
	t: number;
}

export class Particle {
	pos: Vector2d;
	vel: Vector2d;
	color: string;
	radius: number;
	ticksAlive: number;
	alive = true;

	constructor(
		pos = new Vector2d(),
		vel = new Vector2d(),
		color = 'white',
		radius = 5,
		ticksAlive = 0
	) {
		this.pos = pos;
		this.vel = vel;
		this.color = color;
		this.radius = radius;
		this.ticksAlive = ticksAlive;
	}

	static fromObject(obj: ParticleObject): Particle {
		return new Particle(
			Vector2d.fromObject(obj.p) ?? new Vector2d(),
			Vector2d.fromObject(obj.v) ?? new Vector2d(),
			obj.c ?? 'white',
			obj.r ?? 5,
			obj.t ?? 0
		);
	}

	toObject(): ParticleObject {
		return {
			p: this.pos.toObject(),
			v: this.vel.toObject(),
			c: this.color,
			r: this.radius,
			t: this.ticksAlive
		};
	}

	get opacity(): number {
		return Math.max(1 - this.ticksAlive / PARTICLE_MAX_TICKS, 0);
	}

	die(): void {
		this.alive = false;
	}

	updatePhysics(board: Board): void {
		if (!this.alive) return;
		this.pos.iadd(this.vel);
		if (!board.course.containsPos(this.pos)) this.die();
		if (this.ticksAlive > PARTICLE_MAX_TICKS) this.die();
		this.ticksAlive++;
	}
}
