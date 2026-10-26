import type { Ball } from './ball';
import type { GolfObject } from './objects';
import type { Vector2d } from './vector';

export interface TouchInfo {
	isDown: boolean;
	lastDownPos: Vector2d | null;
	lastUpPos: Vector2d | null;
	currPos: Vector2d | null;
	lastDownTime: number | null;
	lastUpTime: number | null;
	focusedBall: Ball | null;
	focusedObject: GolfObject | null;
	draggingObject: boolean;
	gestureHoverPos: Vector2d | null;
	gestureHoverPosTime: number | null;
}

export function createTouchInfo(): TouchInfo {
	return {
		isDown: false,
		lastDownPos: null,
		lastUpPos: null,
		currPos: null,
		lastDownTime: null,
		lastUpTime: null,
		focusedBall: null,
		focusedObject: null,
		draggingObject: false,
		gestureHoverPos: null,
		gestureHoverPosTime: null
	};
}
