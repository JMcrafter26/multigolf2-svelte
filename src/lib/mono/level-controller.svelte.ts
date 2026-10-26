import type { Ball } from '$lib/game/ball';
import { audioEngine } from '$lib/game/audio';
import { gamePhase, GameState, type GameStateObject } from '$lib/game/gamestate';
import { createTouchInfo, type TouchInfo } from '$lib/game/input';
import { Renderer } from '$lib/game/renderer';
import { Vector2d } from '$lib/game/vector';
import { t } from '$lib/i18n/state.svelte';
import { assetUrl, fetchLevelPack, type LevelDefinition, type LevelPackConfig } from './level-data';
import {
	clearChallengeProgress,
	getChallengeProgress,
	hasUnlockedLevel,
	setChallengeProgress,
	setPackHighscore,
	unlockLevel
} from './level-storage';

type DialogMode = 'alert' | 'confirm';

export interface LevelDialog {
	mode: DialogMode;
	title: string;
	text: string;
	defaultYes: boolean;
	onYes: () => void;
	onNo: () => void;
}

const CANVAS_ASPECT_RATIO = 9 / 16;
const DISPLAY_ASPECT_RATIO = 9 / 17;
const CHALLENGE_START_KICKS = 10;

export class LevelController {
	revision = $state(0);
	loading = $state(true);
	error = $state('');
	dialog = $state<LevelDialog | null>(null);
	levelDisplay = $state('00');
	challengeMode = $state(false);
	challengeKicks = $state(0);
	packId = $state('');
	levelId = $state<string | number>('');

	gameState: GameState | null = null;
	ball: Ball | null = null;
	packConfig: LevelPackConfig | null = null;
	private levels: LevelDefinition[] = [];

	private canvas: HTMLCanvasElement | null = null;
	private context: CanvasRenderingContext2D | null = null;
	private container: HTMLElement | null = null;
	private header: HTMLElement | null = null;
	private body: HTMLElement | null = null;

	private touchInfo: TouchInfo = createTouchInfo();
	private frameRequest: number | null = null;
	private destroyed = false;
	private hasGoneToNextLevel = false;
	private challengeLost = false;
	private started = false;

	async attachLayout(options: {
		container: HTMLElement;
		header: HTMLElement;
		body: HTMLElement;
		canvas: HTMLCanvasElement;
	}): Promise<void> {
		this.container = options.container;
		this.header = options.header;
		this.body = options.body;
		if (this.canvas !== options.canvas) {
			this.detachCanvas();
			this.canvas = options.canvas;
			this.context = options.canvas.getContext('2d');
			this.attachCanvas();
		}
		this.resizeCanvas();
		if (this.context && this.gameState) this.render();
	}

	async init(): Promise<void> {
		const params = new URLSearchParams(location.search);
		const id = params.get('id');
		this.packId = params.get('pack') ?? '';
		this.challengeMode = params.get('challenge') === 'true';

		if (!id || !this.packId) {
			this.goBackToLevelChoice();
			return;
		}
		this.levelId = id;

		try {
			await Renderer.load();
			if (this.destroyed) return;

			if (id !== 'editor') {
				const pack = await fetchLevelPack(this.packId);
				if (this.destroyed) return;
				this.levels = pack.levels;
				this.packConfig = pack.config;
			}

			if (this.challengeMode && id !== 'editor') {
				const progress = getChallengeProgress(this.packId);
				if (progress && this.levels.some((level) => String(level.id) === String(progress.level))) {
					this.levelId = progress.level;
					this.challengeKicks = progress.kicks;
				} else {
					this.levelId = 1;
					this.challengeKicks = CHALLENGE_START_KICKS;
				}
			}

			if (
				!this.challengeMode &&
				this.levelId !== 'editor' &&
				!hasUnlockedLevel(this.packId, this.levelId)
			) {
				this.goBackToLevelChoice();
				return;
			}

			if (!this.loadLevel(this.levelId)) {
				this.loading = false;
				this.bump();
				return;
			}
			this.loading = false;
			this.bump();
			this.resizeCanvas();
			this.startLoop();
		} catch (error) {
			this.loading = false;
			this.error = t('level.packConfigError');
			this.bump();
			console.error(error);
		}
	}

	destroy(): void {
		this.destroyed = true;
		if (this.frameRequest !== null) window.cancelAnimationFrame(this.frameRequest);
		window.removeEventListener('resize', this.resizeCanvas);
		this.detachCanvas();
		document.body.style.overflow = '';
	}

	resolveDialog(yes: boolean): void {
		const dialog = this.dialog;
		if (!dialog) return;
		this.dialog = null;
		this.bump();
		if (yes) dialog.onYes();
		else dialog.onNo();
	}

	private loadLevel(id: string | number): boolean {
		let level: LevelDefinition | undefined;

		if (id === 'editor') {
			try {
				const raw = localStorage.getItem('level-maker-temp');
				if (!raw) throw new Error('No editor level');
				const gameState = JSON.parse(raw) as GameStateObject;
				level = { id: 0, difficulty: 'easy', gameState };
				this.levelId = 'editor';
				this.levelDisplay = '??';
			} catch {
				this.goBackToLevelChoice();
				return false;
			}
		} else {
			level = this.levels.find((candidate) => String(candidate.id) === String(id));
			if (!level) {
				this.error = t('level.levelNotFound');
				this.bump();
				return false;
			}
			this.levelId = level.id;
			this.levelDisplay = String(level.id).padStart(2, '0');
		}

		const state = GameState.fromObject(level.gameState, audioEngine);
		state.phase = gamePhase.PlayingSandbox;
		state.board.physicsTime = Date.now();
		state.board.particlesEnabled = true;
		if (this.canvas) state.referenceCanvasSize.set(this.canvas.width, this.canvas.height);

		let ballSprite = 'random';
		const styling = this.packConfig?.styling;
		if (styling) {
			if (styling.grid) state.board.styling.gridSprite = assetUrl(styling.grid);
			if (styling.ball) ballSprite = assetUrl(styling.ball);
			if (styling.colors) {
				if (styling.colors.customWallInner) {
					state.board.styling.customWallInner = styling.colors.customWallInner;
				}
				if (styling.colors.customWallOuter) {
					state.board.styling.customWallOuter = styling.colors.customWallOuter;
				}
				if (styling.colors.pullColor) {
					state.board.styling.pullColor = styling.colors.pullColor;
				}
			}
		}

		this.gameState = state;
		this.ball = state.board.spawnBall({ spriteUrl: ballSprite });

		const url = new URL(location.href);
		url.searchParams.set('pack', this.packId);
		url.searchParams.set('id', String(this.levelId));
		history.replaceState(null, '', url);
		if (this.challengeMode)
			setChallengeProgress(this.packId, this.challengeKicks, Number(this.levelId));

		this.hasGoneToNextLevel = false;
		this.bump();
		return true;
	}

	private startLoop(): void {
		if (this.started) return;
		this.started = true;
		const loop = () => {
			if (this.destroyed) return;
			this.update();
			this.frameRequest = window.requestAnimationFrame(loop);
		};
		this.frameRequest = window.requestAnimationFrame(loop);
	}

	private update(): void {
		const state = this.gameState;
		const canvas = this.canvas;
		const context = this.context;
		if (!state || !canvas || !context) return;

		try {
			state.update();
			Renderer.render(state, context, this.touchInfo, {
				challengeBalls: this.challengeMode ? this.challengeKicks : undefined
			});
			state.referenceCanvasSize.set(canvas.width, canvas.height);
		} catch (error) {
			console.error(error);
		}

		const ball = this.ball;
		if (ball && ball.inHole && ball.radius === 0 && !this.hasGoneToNextLevel && !this.dialog) {
			unlockLevel(this.packId, Number(this.levelId) + 1);
			this.goToNextLevel();
			return;
		}

		if (
			this.challengeMode &&
			this.challengeKicks <= 0 &&
			ball &&
			!ball.isInMovement() &&
			!ball.inHole &&
			!this.dialog &&
			!this.challengeLost
		) {
			this.challengeLost = true;
			clearChallengeProgress(this.packId);
			this.dialog = {
				mode: 'confirm',
				title: t('level.youLost'),
				text: t('level.wantToTryAgain'),
				defaultYes: true,
				onYes: () => location.reload(),
				onNo: () => this.goBackToLevelChoice()
			};
			this.bump();
		}
	}

	private goToNextLevel(): void {
		if (this.hasGoneToNextLevel || this.challengeLost) return;
		this.hasGoneToNextLevel = true;

		if (this.levelId === 'editor') {
			this.loadLevel('editor');
			return;
		}

		const nextLevelId = Number(this.levelId) + 1;
		const nextLevelExists = this.levels.some((level) => String(level.id) === String(nextLevelId));

		if (!nextLevelExists && this.challengeMode) {
			clearChallengeProgress(this.packId);
			setPackHighscore(this.packId, this.challengeKicks);
			const kicks = this.challengeKicks;
			this.dialog = {
				mode: 'alert',
				title: t('level.youWon'),
				text: t('level.youWonLong', { kicks }),
				defaultYes: true,
				onYes: () => this.goBackToLevelChoice(),
				onNo: () => this.goBackToLevelChoice()
			};
			this.bump();
			return;
		}

		if (nextLevelExists && hasUnlockedLevel(this.packId, nextLevelId)) {
			this.loadLevel(nextLevelId);
			if (this.challengeMode) {
				this.challengeKicks++;
				setChallengeProgress(this.packId, this.challengeKicks, nextLevelId);
			}
			return;
		}

		this.goBackToLevelChoice();
	}

	private resizeCanvas = (): void => {
		const container = this.container;
		const header = this.header;
		const body = this.body;
		const canvas = this.canvas;
		if (!container || !header || !body || !canvas) return;

		const displaySize = new Vector2d(100 * DISPLAY_ASPECT_RATIO, DISPLAY_ASPECT_RATIO);
		const maxWidth = window.innerWidth - 20;
		const maxHeight = window.innerHeight - 20;
		if (maxWidth / maxHeight < DISPLAY_ASPECT_RATIO) {
			displaySize.x = maxWidth;
			displaySize.y = maxWidth / DISPLAY_ASPECT_RATIO;
		} else {
			displaySize.y = maxHeight;
			displaySize.x = maxHeight * DISPLAY_ASPECT_RATIO;
		}

		const canvasBodyHeight = (DISPLAY_ASPECT_RATIO / CANVAS_ASPECT_RATIO) * displaySize.y;
		const canvasHeaderHeight = displaySize.y - canvasBodyHeight;

		container.style.width = `${displaySize.x}px`;
		container.style.height = `${displaySize.y}px`;
		container.style.gridTemplateRows = `${canvasHeaderHeight}px ${canvasBodyHeight}px`;
		canvas.style.width = `${displaySize.x}px`;
		canvas.style.height = `${canvasBodyHeight}px`;
		body.style.width = `${displaySize.x}px`;
		body.style.height = `${canvasBodyHeight}px`;
		header.style.width = `${displaySize.x}px`;
		header.style.height = `${canvasHeaderHeight}px`;
		header.style.setProperty('--height', `${canvasHeaderHeight}px`);

		if (this.gameState && canvas.width !== 0 && canvas.height !== 0) {
			this.gameState.referenceCanvasSize.set(canvas.clientWidth, canvas.clientHeight);
		}
	};

	private render(): void {
		if (!this.gameState || !this.context) return;
		Renderer.render(this.gameState, this.context, this.touchInfo, {
			challengeBalls: this.challengeMode ? this.challengeKicks : undefined
		});
	}

	private attachCanvas(): void {
		window.addEventListener('resize', this.resizeCanvas);
		if (!this.canvas) return;
		this.canvas.addEventListener('pointerdown', this.onPointerDown);
		this.canvas.addEventListener('pointermove', this.onPointerMove);
		this.canvas.addEventListener('pointerup', this.onPointerUp);
		this.canvas.addEventListener('pointercancel', this.onPointerCancel);
	}

	private detachCanvas(): void {
		window.removeEventListener('resize', this.resizeCanvas);
		if (!this.canvas) return;
		this.canvas.removeEventListener('pointerdown', this.onPointerDown);
		this.canvas.removeEventListener('pointermove', this.onPointerMove);
		this.canvas.removeEventListener('pointerup', this.onPointerUp);
		this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
	}

	private pointerPosition(event: PointerEvent): Vector2d {
		const canvas = this.canvas;
		if (!canvas) return new Vector2d();
		const rect = canvas.getBoundingClientRect();
		return new Vector2d(
			((event.clientX - rect.left) / Math.max(rect.width, 1)) * (canvas.width || rect.width || 1),
			((event.clientY - rect.top) / Math.max(rect.height, 1)) * (canvas.height || rect.height || 1)
		);
	}

	private onPointerDown = (event: PointerEvent): void => {
		if (this.dialog || !this.gameState || this.gameState.phase !== gamePhase.PlayingSandbox) {
			return;
		}
		try {
			this.canvas?.setPointerCapture(event.pointerId);
		} catch {
			/* not critical */
		}
		const pos = this.pointerPosition(event);
		this.touchInfo.isDown = true;
		this.touchInfo.currPos = pos;
		this.touchInfo.lastDownPos = pos.copy();
		this.touchInfo.lastDownTime = Date.now();
		this.touchInfo.lastUpPos = null;

		const boardPos = this.gameState.screenPosToBoardPos(pos);
		let smallestDistance = Infinity;
		let closestBall: Ball | null = null;
		for (const ball of this.gameState.board.balls) {
			if (ball.isInMovement() || !ball.active) continue;
			const distance = ball.pos.distance(boardPos);
			if (distance < smallestDistance) {
				smallestDistance = distance;
				closestBall = ball;
			}
		}
		if (smallestDistance < 100) this.touchInfo.focusedBall = closestBall;
	};

	private onPointerMove = (event: PointerEvent): void => {
		if (!this.touchInfo.isDown) return;
		this.touchInfo.currPos = this.pointerPosition(event);
	};

	private onPointerUp = (event: PointerEvent): void => {
		if (!this.touchInfo.isDown) return;
		const pos = this.pointerPosition(event);
		this.touchInfo.isDown = false;
		this.touchInfo.lastUpPos = pos;
		this.touchInfo.lastUpTime = Date.now();
		this.onKick();
		this.touchInfo.focusedBall = null;
	};

	private onPointerCancel = (): void => {
		this.touchInfo.isDown = false;
		this.touchInfo.focusedBall = null;
	};

	private onKick(): void {
		const state = this.gameState;
		const ball = this.touchInfo.focusedBall;
		const down = this.touchInfo.lastDownPos;
		const up = this.touchInfo.lastUpPos;
		if (!state || !ball || !down || !up) return;
		if (this.challengeMode && this.challengeKicks <= 0) return;
		if (down.distance(up) < 10) return;

		// Legacy strength: distance between the ball and the point where the
		// finger was released, measured on the board.
		const touchUpBoardPos = state.screenPosToBoardPos(up);
		const strength = Math.min(ball.pos.distance(touchUpBoardPos) * 0.25, 60);
		const direction = ball.pos.sub(touchUpBoardPos).normalized.scale(-strength);
		ball.kick(direction);

		if (this.challengeMode) {
			this.challengeKicks--;
			if (this.challengeKicks > 0) {
				setChallengeProgress(this.packId, this.challengeKicks, Number(this.levelId));
			} else {
				clearChallengeProgress(this.packId);
			}
			this.bump();
		}
	}

	private goBackToLevelChoice(): void {
		window.location.href = '/mono/';
	}

	private bump(): void {
		this.revision++;
	}
}
