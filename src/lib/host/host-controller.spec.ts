import { describe, expect, it } from 'vitest';
import { gamePhase } from '../game/gamestate';
import { golfObjectType, GolfObject } from '../game/objects';
import { Course, PhoneCoordinates } from '../game/phone-coordinates';
import { HostController } from './host-controller.svelte';

describe('HostController.playAgain', () => {
	it('keeps the constructed course so it can be reused for the next round', () => {
		const controller = new HostController();
		controller.gameState.board.course = new Course([PhoneCoordinates.fromWidthHeight(360, 640)]);
		controller.gameState.board.objects = [
			GolfObject.makeDefault(golfObjectType.Start),
			GolfObject.makeDefault(golfObjectType.Hole)
		];

		controller.playAgain();

		expect(controller.phase).toBe(gamePhase.ModeChoice);
		expect(controller.canKeepLayout).toBe(true);
		expect(controller.gameState.board.objects).toHaveLength(2);
		expect(controller.gameState.board.course.phones).toHaveLength(1);
	});

	it('stays on an empty course if no level was built yet', () => {
		const controller = new HostController();
		controller.playAgain();

		expect(controller.phase).toBe(gamePhase.ModeChoice);
		expect(controller.canKeepLayout).toBe(false);
	});
});
