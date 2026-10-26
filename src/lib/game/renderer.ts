import type { GameState } from './gamestate';
import { gamePhase, isPlayingPhase } from './gamestate';
import type { GameEffects } from './effects';
import type { TouchInfo } from './input';
import { golfObjectType, type GolfObject } from './objects';
import { Sprite } from './sprites';
import { SpriteCache } from './sprite-cache';
import { Vector2d } from './vector';

export const GRID_BLOCK_SIZE = 20;

interface DrawSpriteOptions {
	angle?: number;
	imageSmoothing?: boolean;
	opacity?: number;
}

interface RenderBoardOptions {
	drawBalls?: boolean;
	drawSelection?: boolean;
	drawGravity?: boolean;
	drawConnectionLines?: boolean;
}

export interface RenderOptions {
	preventScrolling?: boolean;
	challengeBalls?: number;
	resolution?: Vector2d;
	effects?: GameEffects;
}

export class Renderer {
	static startSize = new Vector2d(40, 40);
	static endSize = new Vector2d(50, 50);

	static async load(): Promise<void> {
		await SpriteCache.load(Object.values(Sprite));
	}

	static updateCanvasSize(context: CanvasRenderingContext2D, resolution?: Vector2d): void {
		if (resolution) {
			context.canvas.width = Math.max(1, Math.floor(resolution.x));
			context.canvas.height = Math.max(1, Math.floor(resolution.y));
		} else {
			context.canvas.width = Math.max(1, context.canvas.clientWidth);
			context.canvas.height = Math.max(1, context.canvas.clientHeight);
		}
	}

	static drawSprite(
		context: CanvasRenderingContext2D,
		centerPos: Vector2d,
		size: Vector2d,
		sprite: string,
		{ angle = 0, imageSmoothing = false, opacity = 1 }: DrawSpriteOptions = {}
	): void {
		const image = SpriteCache.image(sprite);
		if (!image) return;

		context.imageSmoothingEnabled = imageSmoothing;
		context.save();
		context.globalAlpha = opacity;
		context.translate(centerPos.x, centerPos.y);
		context.rotate(angle);
		context.drawImage(image, -size.x / 2, -size.y / 2, size.x, size.y);
		context.restore();
	}

	static renderNothing(_gameState: GameState, context: CanvasRenderingContext2D): void {
		context.canvas.style.display = 'none';
		document.body.style.overflow = 'visible';
		const legacyDocument = document as Document & {
			mozFullScreenElement?: Element | null;
			webkitFullscreenElement?: Element | null;
			msExitFullscreen?: () => void;
			mozCancelFullScreen?: () => void;
			webkitCancelFullScreen?: () => void;
		};
		const fullscreenElement =
			legacyDocument.mozFullScreenElement ||
			legacyDocument.webkitFullscreenElement ||
			document.fullscreenElement;
		if (fullscreenElement) {
			if (document.exitFullscreen) {
				void document.exitFullscreen();
			} else if (legacyDocument.msExitFullscreen) {
				legacyDocument.msExitFullscreen();
			} else if (legacyDocument.mozCancelFullScreen) {
				legacyDocument.mozCancelFullScreen();
			} else if (legacyDocument.webkitCancelFullScreen) {
				legacyDocument.webkitCancelFullScreen();
			}
		}
	}

	static drawCircle(context: CanvasRenderingContext2D, pos: Vector2d, radius: number): void {
		context.beginPath();
		context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false);
	}

	static renderConnectionLines(gameState: GameState, context: CanvasRenderingContext2D): void {
		for (const line of gameState.board.course.lines) {
			context.beginPath();
			const startPos = gameState.boardPosToScreenPos(line.start);
			const endPos = gameState.boardPosToScreenPos(line.end);
			context.moveTo(startPos.x, startPos.y);
			context.lineTo(endPos.x, endPos.y);
			context.lineWidth = GRID_BLOCK_SIZE / gameState.combinedScalingFactor;
			context.strokeStyle = line.color;
			context.lineCap = 'round';
			context.stroke();
		}
	}

	static renderConstruction(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		touchInfo: TouchInfo
	): void {
		const canvas = context.canvas;
		canvas.style.display = 'block';
		context.fillStyle = '#79FFB6';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.textBaseline = 'middle';
		context.textAlign = 'center';
		context.font = `${this.screenUnit * 3}px Arial`;
		context.fillStyle = 'black';
		context.fillText(`${gameState.deviceIndex}.`, canvas.width / 2, canvas.height / 2);

		if (touchInfo.isDown) {
			if (touchInfo.lastDownPos && touchInfo.currPos) {
				context.beginPath();
				context.moveTo(touchInfo.lastDownPos.x, touchInfo.lastDownPos.y);
				context.lineTo(touchInfo.currPos.x, touchInfo.currPos.y);
				context.lineWidth = 30;
				context.lineCap = 'round';
				context.strokeStyle = '#bac4ff';
				context.stroke();
			}
			if (touchInfo.currPos) {
				context.fillStyle = 'blue';
				this.drawCircle(context, touchInfo.currPos, 25);
				context.fill();
			}
		}

		this.renderConnectionLines(gameState, context);
	}

	static drawObjectOutline(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		object: GolfObject
	): void {
		const screenCorners = object
			.getInnerCorners(-10)
			.map((corner) => gameState.boardPosToScreenPos(corner));

		context.beginPath();
		context.moveTo(screenCorners[0].x, screenCorners[0].y);
		for (let i = 1; i <= screenCorners.length; i++) {
			const point = screenCorners[i % screenCorners.length];
			context.lineTo(point.x, point.y);
		}
		context.strokeStyle = 'blue';
		context.lineWidth = 3 / gameState.combinedScalingFactor;
		context.lineCap = 'round';
		context.stroke();

		const dragCornerSize = new Vector2d(GRID_BLOCK_SIZE, GRID_BLOCK_SIZE).scale(
			2 / gameState.combinedScalingFactor
		);
		this.drawSprite(
			context,
			gameState.boardPosToScreenPos(object.dragCorner),
			dragCornerSize,
			Sprite.ZoomIcon,
			{ imageSmoothing: true }
		);
	}

	static fillShape(context: CanvasRenderingContext2D, corners: Vector2d[], color: string): void {
		if (!corners.length) return;
		context.beginPath();
		context.moveTo(corners[0].x, corners[0].y);
		for (let i = 1; i <= corners.length; i++) {
			const point = corners[i % corners.length];
			context.lineTo(point.x, point.y);
		}
		context.fillStyle = color;
		context.fill();
	}

	static drawCustomWall(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		object: GolfObject
	): void {
		const innerCorners = object.getInnerCorners((GRID_BLOCK_SIZE / 4) * Math.sqrt(2));
		const screenCorners = object.corners.map((corner) => gameState.boardPosToScreenPos(corner));
		const screenInnerCorners = innerCorners.map((corner) => gameState.boardPosToScreenPos(corner));
		this.fillShape(context, screenCorners, gameState.board.styling.customWallOuter);
		this.fillShape(context, screenInnerCorners, gameState.board.styling.customWallInner);
	}

	static drawGravityArrow(
		context: CanvasRenderingContext2D,
		pos: Vector2d,
		direction: Vector2d
	): void {
		direction = direction.rotate(-Math.PI / 2);
		context.save();
		context.translate(pos.x, pos.y);
		context.rotate(direction.angle);
		context.scale(direction.length, direction.length);
		context.beginPath();
		context.moveTo(-0.5, 0);
		context.lineTo(0.5, 0);
		context.lineTo(0, 1);
		context.lineTo(-0.5, 0);
		context.fillStyle = '#5cfaa3';
		context.fill();
		context.restore();
	}

	static drawGravityArrows(gameState: GameState, context: CanvasRenderingContext2D): void {
		let arrowDirection = gameState.thisPhone?.gravity;
		if (!arrowDirection) return;
		arrowDirection = arrowDirection.scale(200 / gameState.scalingFactor);
		if (arrowDirection.length < 30 / gameState.scalingFactor) {
			arrowDirection = arrowDirection.normalized.scale(30 / gameState.scalingFactor);
		}

		const pos = new Vector2d();
		const gridSize = Math.max(arrowDirection.length * 2, 100 / gameState.scalingFactor);
		for (let x = gridSize / 2; x < context.canvas.width; x += gridSize) {
			for (let y = gridSize / 2; y < context.canvas.height; y += gridSize) {
				pos.set(x, y);
				this.drawGravityArrow(context, pos, arrowDirection);
			}
		}
	}

	static renderBoard(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		touchInfo: TouchInfo,
		{
			drawBalls = true,
			drawSelection = true,
			drawGravity = false,
			drawConnectionLines = false
		}: RenderBoardOptions = {}
	): void {
		context.canvas.style.display = 'block';
		const backgroundSizePx = (GRID_BLOCK_SIZE * 8) / gameState.combinedScalingFactor;
		const backgroundSizePercent = Math.max((backgroundSizePx / context.canvas.width) * 100, 1);
		context.canvas.style.backgroundSize = `${backgroundSizePercent}%`;
		context.canvas.style.backgroundImage = `url(${gameState.board.styling.gridSprite})`;

		if (drawConnectionLines) this.renderConnectionLines(gameState, context);
		if (drawGravity) this.drawGravityArrows(gameState, context);

		for (const object of gameState.board.objects) {
			if (object.type === golfObjectType.CustomWall) {
				this.drawCustomWall(gameState, context, object);
			} else {
				this.drawSprite(
					context,
					gameState.boardPosToScreenPos(object.pos),
					object.size.scale(1 / gameState.combinedScalingFactor),
					object.sprite,
					{ angle: gameState.boardAngleToScreenAngle(object.angle) }
				);
			}
		}

		if (drawSelection && touchInfo.focusedObject) {
			this.drawObjectOutline(gameState, context, touchInfo.focusedObject);
		}

		if (!drawBalls) return;

		const renderBalls = gameState.board.balls.slice();
		renderBalls.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));

		for (const ball of renderBalls) {
			const screenPos = gameState.boardPosToScreenPos(ball.pos);
			const size = new Vector2d(ball.radius, ball.radius).scale(
				2 / gameState.combinedScalingFactor
			);
			const opacity = !ball.active && !ball.isMoving() ? 0.5 : 1;

			context.save();
			context.translate(screenPos.x, screenPos.y);
			context.rotate(gameState.boardAngleToScreenAngle(ball.rotationAngle));
			this.drawSprite(context, new Vector2d(), size, ball.spriteUrl, { opacity });
			context.restore();
		}

		if (gameState.board.particlesEnabled) {
			for (const particle of gameState.board.particles) {
				context.globalAlpha = particle.opacity;
				const screenPos = gameState.boardPosToScreenPos(particle.pos);
				context.fillStyle = particle.color;
				const size = particle.radius / gameState.combinedScalingFactor;
				context.fillRect(screenPos.x, screenPos.y, size, size);
			}
			context.globalAlpha = 1;
		}
	}

	static renderGestureHover(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		touchInfo: TouchInfo
	): void {
		if (!touchInfo.gestureHoverPos || !touchInfo.gestureHoverPosTime) return;
		const timeDelta = Date.now() - touchInfo.gestureHoverPosTime;
		const hoverSize = Math.max(0, 1000 - timeDelta) / 40;
		this.drawCircle(context, touchInfo.gestureHoverPos, hoverSize);
		context.fillStyle = gameState.board.styling.pullColor;
		context.fill();
	}

	static renderBallInteractions(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		touchInfo: TouchInfo
	): void {
		if (touchInfo.gestureHoverPos && touchInfo.gestureHoverPosTime) {
			this.renderGestureHover(gameState, context, touchInfo);
		}
		if (!touchInfo.isDown || !touchInfo.focusedBall || !touchInfo.currPos) return;

		const ballScreenPos = gameState.boardPosToScreenPos(touchInfo.focusedBall.pos);
		context.beginPath();
		context.moveTo(ballScreenPos.x, ballScreenPos.y);
		context.lineTo(touchInfo.currPos.x, touchInfo.currPos.y);
		context.strokeStyle = gameState.board.styling.pullColor;
		context.lineWidth = touchInfo.focusedBall.radius / gameState.combinedScalingFactor;
		context.lineCap = 'round';
		context.stroke();
	}

	static renderPlacingTools(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		touchInfo: TouchInfo
	): void {
		if (
			gameState.placingObjectType === golfObjectType.Eraser &&
			touchInfo.isDown &&
			touchInfo.currPos
		) {
			this.drawSprite(context, touchInfo.currPos, new Vector2d(60, 60), Sprite.Eraser, {
				angle: gameState.boardAngleToScreenAngle(0)
			});
		}
	}

	static renderChallengeBalls(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		challengeBalls: number
	): void {
		const fontSize = context.canvas.height * 0.06;
		const padding = 10;
		context.font = `bold ${fontSize}px monospace`;
		context.fillStyle = 'black';
		context.textAlign = 'left';
		context.textBaseline = 'top';
		context.fillText(String(challengeBalls), padding + fontSize, 10);
		const ballSprite = gameState.board.balls[0]?.spriteUrl ?? Sprite.BallWhite;
		this.drawSprite(
			context,
			new Vector2d(padding + fontSize * 0.4, padding + fontSize * 0.4),
			new Vector2d(fontSize * 0.8, fontSize * 0.8),
			ballSprite
		);
	}

	static render(
		gameState: GameState,
		context: CanvasRenderingContext2D,
		touchInfo: TouchInfo,
		{ preventScrolling = true, challengeBalls, resolution }: RenderOptions = {}
	): void {
		this.updateCanvasSize(context, resolution);
		if (preventScrolling) document.body.style.overflow = 'hidden';

		if (
			gameState.phase === gamePhase.ConstructionChoice ||
			gameState.phase === gamePhase.ConstructionAuto ||
			gameState.phase === gamePhase.ConstructionCustom
		) {
			this.renderConstruction(gameState, context, touchInfo);
			return;
		}

		if (gameState.phase === gamePhase.Placing) {
			this.renderBoard(gameState, context, touchInfo, {
				drawBalls: false,
				drawGravity: false,
				drawConnectionLines: true
			});
			this.renderPlacingTools(gameState, context, touchInfo);
			return;
		}

		if (isPlayingPhase(gameState.phase)) {
			this.renderBoard(gameState, context, touchInfo, {
				drawSelection: false,
				drawGravity: false
			});
			if (challengeBalls !== undefined) {
				this.renderChallengeBalls(gameState, context, challengeBalls);
			}
			this.renderBallInteractions(gameState, context, touchInfo);
			return;
		}

		this.renderNothing(gameState, context);
	}

	static get screenUnit(): number {
		return Math.min(window.innerWidth, window.innerHeight) * 0.1;
	}
}
