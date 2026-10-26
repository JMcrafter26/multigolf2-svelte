import { describe, expect, it } from 'vitest';
import { Board } from './board';
import { gameMode, gamePhase, GameState, Player } from './gamestate';
import { golfObjectType, GolfObject } from './objects';
import { Course, PhoneCoordinates } from './phone-coordinates';
import { Vector2d } from './vector';

function makeState(): GameState {
	const course = new Course([PhoneCoordinates.fromWidthHeight(400, 800)]);
	const board = new Board(course, [
		GolfObject.makeDefault(golfObjectType.Start).setPos(new Vector2d(200, 600)),
		GolfObject.makeDefault(golfObjectType.Hole).setPos(new Vector2d(200, 200))
	]);
	return new GameState(
		gamePhase.PlayingSandbox,
		gameMode.Sandbox,
		board,
		true,
		[new Player('Ada', [2, 3]), new Player('Grace')],
		1,
		golfObjectType.Lava,
		4,
		2,
		1,
		0,
		12
	);
}

describe('GameState serialization', () => {
	it('round-trips through the compact wire format', () => {
		const original = makeState();
		const restored = GameState.fromObject(original.toObject(2));

		expect(restored.phase).toBe(original.phase);
		expect(restored.mode).toBe(original.mode);
		expect(restored.deviceIndex).toBe(2);
		expect(restored.cameraControlsActive).toBe(true);
		expect(restored.placingObjectType).toBe(golfObjectType.Lava);
		expect(restored.tournamentBuilderIndex).toBe(4);
		expect(restored.tournamentBallIndex).toBe(2);
		expect(restored.duellActivePlayerIndex).toBe(1);
		expect(restored.duellWinnerIndex).toBe(0);
		expect(restored.tournamentMaxKicks).toBe(12);
		expect(restored.players.map((player) => player.name)).toEqual(['Ada', 'Grace']);
		expect(restored.players[0].score).toBe(5);
		expect(restored.board.objects).toHaveLength(2);
		expect(restored.board.objects[0].type).toBe(golfObjectType.Start);
		expect(restored.board.course.phones).toHaveLength(1);
	});

	it('converts between screen and board coordinates', () => {
		const state = makeState();
		state.referenceCanvasSize.set(400, 800);
		const boardPos = state.screenPosToBoardPos(new Vector2d(100, 400));
		const screenPos = state.boardPosToScreenPos(boardPos);
		expect(screenPos.x).toBeCloseTo(100);
		expect(screenPos.y).toBeCloseTo(400);
	});
});

describe('Player.fromObject', () => {
	it('repairs the legacy numeric-score payload', () => {
		const player = Player.fromObject({
			name: 'Legacy',
			// The old bug serialized the summed score instead of the round array.
			roundScores: 7 as unknown as number[]
		});
		expect(player.roundScores).toEqual([]);
		expect(player.score).toBe(0);
	});
});
