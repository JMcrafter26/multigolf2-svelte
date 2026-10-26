import { describe, expect, it } from 'vitest';
import { Board } from './board';
import { golfObjectType, GolfObject } from './objects';
import { Course, PhoneCoordinates } from './phone-coordinates';
import { Vector2d } from './vector';

function makeBoard(): Board {
	const course = new Course([PhoneCoordinates.fromWidthHeight(400, 800)]);
	const board = new Board(course, [
		GolfObject.makeDefault(golfObjectType.Start).setPos(new Vector2d(200, 600)),
		GolfObject.makeDefault(golfObjectType.Hole).setPos(new Vector2d(200, 200))
	]);
	board.deviceGravityEnabled = false;
	return board;
}

describe('ball physics', () => {
	it('moves after a kick and drops into the hole', () => {
		const board = makeBoard();
		const ball = board.spawnBall({ spriteUrl: 'ball-white' });

		expect(ball.pos.y).toBe(600);
		expect(ball.isMoving()).toBe(false);

		ball.kick(new Vector2d(0, -30));
		expect(ball.isMoving()).toBe(true);

		for (let i = 0; i < 1000 && !ball.inHole; i++) {
			board.physicsStep();
		}

		expect(ball.inHole).toBe(true);

		for (let i = 0; i < 600 && ball.radius > 0; i++) {
			board.physicsStep();
		}
		expect(ball.radius).toBe(0);
		expect(ball.isMoving()).toBe(false);
	});

	it('reflects off the course wall', () => {
		const board = makeBoard();
		const ball = board.spawnBall({ spriteUrl: 'ball-white' });

		ball.kick(new Vector2d(60, 0));

		let reflected = false;
		for (let i = 0; i < 1000; i++) {
			board.physicsStep();
			if (ball.vel.x < -0.5 && ball.pos.x > 200) {
				reflected = true;
				break;
			}
		}

		expect(reflected).toBe(true);
		expect(ball.pos.x).toBeLessThanOrEqual(400);
	});

	it('resets a ball that leaves the course', () => {
		const board = makeBoard();
		const ball = board.spawnBall({ spriteUrl: 'ball-white' });

		ball.pos = new Vector2d(500, 600);
		for (let i = 0; i < 30; i++) {
			board.physicsStep();
		}

		expect(ball.pos.x).toBe(200);
		expect(ball.pos.y).toBe(600);
	});
});
