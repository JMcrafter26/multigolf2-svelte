import type { Ball } from '$lib/game/ball';
import { Board } from '$lib/game/board';
import { audioEngine } from '$lib/game/audio';
import { gamePhase, GameState, isPlayingPhase, type GameStateObject } from '$lib/game/gamestate';
import { createTouchInfo, type TouchInfo } from '$lib/game/input';
import { golfObjectType, placableObjects } from '$lib/game/objects';
import { ConstructionLine, Course, PhoneCoordinates } from '$lib/game/phone-coordinates';
import { Renderer } from '$lib/game/renderer';
import { Vector2d } from '$lib/game/vector';
import { t } from '$lib/i18n/state.svelte';
import { DataMessage, dataMessageType } from '$lib/net/protocol';
import { RtcClient } from '$lib/net/rtc';
import { HandControls } from './hand-controls';
import { NoSleep } from './no-sleep';

type ClientStatus = 'loading' | 'connecting' | 'connected' | 'error' | 'invalid';

const MIN_CREDIT_CARD_HEIGHT = 100;
const MAX_CREDIT_CARD_HEIGHT = 1000;
const DEVICE_INDEX_STORAGE = 'multigolf-deviceIndex';
const POOL_STORAGE = 'multigolf-poolUid';
const CREDIT_CARD_STORAGE = 'credit-card-px-height';

interface TiltState {
	tilt: Vector2d;
	previousSteadyTilt: Vector2d;
	lastSignificantMoveTime: number;
	hasChangedFlag: boolean;
}

function snapAngle(angle: number): number {
	const mod = (n: number, m: number) => ((n % m) + m) % m;
	angle = mod(angle, Math.PI * 2);
	const values = [
		0,
		Math.PI / 2,
		Math.PI,
		(Math.PI * 3) / 2,
		Math.PI * 2,
		Math.PI / 4,
		(Math.PI / 4) * 3,
		(Math.PI / 4) * 5,
		(Math.PI / 4) * 7
	];
	for (const value of values) {
		if (Math.abs(value - angle) < 0.1) return value;
	}
	return angle;
}

function parseStoredIndex(value: string | null): number | null {
	if (value === null || value === 'null') return null;
	const parsed = Number.parseInt(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export class ClientController {
	revision = $state(0);
	status = $state<ClientStatus>('loading');
	statusMessage = $state(t('net.connectingToHost'));
	ready = $state(false);
	deviceIndex = $state<number | null>(null);
	logLines = $state<string[]>([]);
	showLog = $state(false);
	showCreditCard = $state(true);
	creditCardPixelHeight = $state(500);
	fullscreenOnCanvasClick = $state(true);
	handActive = $state(false);
	handError = $state('');

	gameState: GameState | null = null;
	rtc: RtcClient | null = null;
	canvas: HTMLCanvasElement | null = null;
	context: CanvasRenderingContext2D | null = null;
	poolUid = '';

	private touchInfo: TouchInfo = createTouchInfo();
	private frameRequest: number | null = null;
	private orientationTimer: number | null = null;
	private handTimer: number | null = null;
	private reconnectTimer: number | null = null;
	private resizeListener: (() => void) | null = null;
	private destroyed = false;
	private renderCurrPos: Vector2d | null = null;
	private renderHoverPos: Vector2d | null = null;
	private hostTimeOffset = 0;
	private noSleep = new NoSleep();
	private initialization: Promise<void> | null = null;

	private handControls = new HandControls({ volatilityResistance: 4, minimumImageDelay: 100 });
	private handDraggingBallUid: string | null = null;
	private handDragStartPos: Vector2d | null = null;
	private handDragPos: Vector2d | null = null;

	private tilt: TiltState = {
		tilt: new Vector2d(),
		previousSteadyTilt: new Vector2d(),
		lastSignificantMoveTime: Date.now(),
		hasChangedFlag: false
	};

	async init(): Promise<void> {
		if (this.initialization) return this.initialization;
		this.initialization = this.initialize();
		return this.initialization;
	}

	async attachCanvas(canvas: HTMLCanvasElement): Promise<void> {
		if (this.canvas !== canvas) {
			this.detachCanvasListeners();
			this.canvas = canvas;
			this.context = canvas.getContext('2d');
			this.attachCanvasListeners();
		}
		await this.init();
		if (this.context) this.renderFrame();
	}

	async confirmSizing(): Promise<void> {
		this.showCreditCard = false;
		await this.requestMotionPermission();
		await this.requestWakeLock();
		this.log(t('client.tapToStart'));
	}

	showCreditCardScreen(): void {
		this.showCreditCard = true;
	}

	setCreditCardHeight(height: number): void {
		const clamped = Math.max(
			MIN_CREDIT_CARD_HEIGHT,
			Math.min(MAX_CREDIT_CARD_HEIGHT, Math.round(height))
		);
		this.creditCardPixelHeight = clamped;
		try {
			localStorage.setItem(CREDIT_CARD_STORAGE, String(clamped));
		} catch {
			/* ignore */
		}
	}

	setFullscreenOnClick(value: boolean): void {
		this.fullscreenOnCanvasClick = value;
	}

	retryNow(): void {
		if (this.reconnectTimer !== null) {
			window.clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		void this.connect();
	}

	destroy(): void {
		this.destroyed = true;
		if (this.frameRequest !== null) window.cancelAnimationFrame(this.frameRequest);
		if (this.orientationTimer !== null) window.clearInterval(this.orientationTimer);
		if (this.handTimer !== null) window.clearInterval(this.handTimer);
		if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
		this.handControls.destroy();
		this.handControls = new HandControls({ volatilityResistance: 4, minimumImageDelay: 100 });
		if (this.resizeListener) window.removeEventListener('resize', this.resizeListener);
		window.removeEventListener('deviceorientation', this.onDeviceOrientation, true);
		window.removeEventListener('pointerdown', this.requestWakeLock);
		window.removeEventListener('beforeunload', this.beforeUnload);
		this.detachCanvasListeners();
		this.rtc?.die();
		this.noSleep.destroy();
		document.body.style.overflow = '';
	}

	get connectionStatusColor(): string {
		void this.revision;
		return this.rtc?.getStatus().color ?? 'blue';
	}

	get connectionCode(): string {
		return this.poolUid;
	}

	// --- initialization ------------------------------------------------------

	private async initialize(): Promise<void> {
		const params = new URLSearchParams(location.search);
		this.poolUid = params.get('p') ?? '';
		if (!this.poolUid) {
			this.status = 'invalid';
			this.statusMessage = t('client.invalidCode');
			return;
		}

		this.fullscreenOnCanvasClick = !params.has('nofullscreen');
		this.loadDeviceIndex();
		this.loadCreditCardHeight();
		window.addEventListener('beforeunload', this.beforeUnload);
		window.addEventListener('deviceorientation', this.onDeviceOrientation, true);
		window.addEventListener('pointerdown', this.requestWakeLock, { once: true });
		this.resizeListener = () => {
			this.applyFullHeight();
		};
		window.addEventListener('resize', this.resizeListener);
		this.applyFullHeight();

		try {
			await Renderer.load();
			if (this.destroyed) return;
			this.ready = true;
			this.bump();
		} catch (error) {
			this.log(`Could not load sprites: ${String(error)}`);
		}
		if (this.destroyed) return;

		this.startRenderLoop();
		this.startOrientationLoop();
		this.startHandControlLoop();
		this.setupHandControls();
		await this.connect();
	}

	private loadDeviceIndex(): void {
		try {
			const storedPool = localStorage.getItem(POOL_STORAGE);
			if (storedPool === this.poolUid) {
				this.deviceIndex = parseStoredIndex(localStorage.getItem(DEVICE_INDEX_STORAGE));
			} else {
				localStorage.setItem(POOL_STORAGE, this.poolUid);
				localStorage.setItem(DEVICE_INDEX_STORAGE, 'null');
			}
		} catch {
			/* ignore */
		}
	}

	private loadCreditCardHeight(): void {
		try {
			const stored = Number.parseInt(localStorage.getItem(CREDIT_CARD_STORAGE) ?? '');
			if (
				Number.isFinite(stored) &&
				stored >= MIN_CREDIT_CARD_HEIGHT &&
				stored <= MAX_CREDIT_CARD_HEIGHT
			) {
				this.creditCardPixelHeight = stored;
			}
		} catch {
			/* ignore */
		}
	}

	private applyFullHeight(): void {
		const height = window.screen?.availHeight || window.innerHeight;
		document.body.style.setProperty('--full-height', `${height - 1}px`);
	}

	// --- networking ----------------------------------------------------------

	private async connect(): Promise<void> {
		if (this.destroyed || !this.poolUid) return;
		this.rtc?.die();
		this.rtc = null;
		this.status = 'connecting';
		this.statusMessage = t('client.joining');
		this.bump();

		try {
			const client = new RtcClient({
				logFunction: (message) => this.log(message),
				onDataMessage: (message) => this.onDataMessage(message),
				onDataClose: () => this.onConnectionClosed(),
				poolUid: this.poolUid
			});
			this.rtc = client;
			await client.start(this.deviceIndex);
			if (this.destroyed || this.rtc !== client) return;
			this.status = 'connected';
			this.statusMessage = t('net.connectedToHost');
			this.resetGameState();
			this.bump();
		} catch (error) {
			this.log(t('client.connectionFailed'));
			this.log(`Error: ${String(error)}`);
			this.status = 'error';
			this.statusMessage = t('client.connectionLost');
			this.bump();
			this.scheduleReconnect(10_000);
		}
	}

	private onConnectionClosed(): void {
		if (this.destroyed) return;
		this.status = 'error';
		this.statusMessage = t('client.connectionLost');
		this.bump();
		this.log(t('client.reconnecting'));
		this.scheduleReconnect(5000);
	}

	private scheduleReconnect(delayMs: number): void {
		if (this.destroyed || this.reconnectTimer !== null) return;
		this.reconnectTimer = window.setTimeout(() => {
			this.reconnectTimer = null;
			void this.connect();
		}, delayMs);
	}

	private resetGameState(): void {
		this.touchInfo = createTouchInfo();
		this.handDraggingBallUid = null;
		this.handDragStartPos = null;
		this.handDragPos = null;
		this.renderCurrPos = null;
		this.renderHoverPos = null;
		const board = new Board();
		board.effects = audioEngine;
		this.gameState = new GameState(
			gamePhase.Connecting,
			'none',
			board,
			false,
			[],
			this.deviceIndex
		);
		this.gameState.board.effects = audioEngine;
	}

	private onDataMessage(message: DataMessage): void {
		const data = message.data as Record<string, unknown>;
		if (message.type === dataMessageType.PING) {
			const incomingIndex = Number.parseInt(String(data.index));
			if (Number.isFinite(incomingIndex)) this.updateDeviceIndex(incomingIndex);
			this.status = 'connected';
			this.statusMessage = t('net.connectedToHost');

			const displaySize = new Vector2d(window.innerWidth, window.innerHeight);
			if (this.creditCardPixelHeight > 0) {
				displaySize.iscale(400 / this.creditCardPixelHeight);
			}
			this.rtc?.sendMessage(DataMessage.Ping({ displaySize: displaySize.toObject() }));
			return;
		}

		if (message.type === dataMessageType.GAMESTATE) {
			try {
				const state = GameState.fromObject(data as unknown as GameStateObject, audioEngine);
				if (typeof state.deviceIndex === 'number') {
					this.updateDeviceIndex(state.deviceIndex);
				}
				if (this.canvas) {
					state.referenceCanvasSize.set(this.canvas.width, this.canvas.height);
				}
				if (this.touchInfo.focusedObject && this.touchInfo.isDown) {
					state.board.updateObject(this.touchInfo.focusedObject);
				}
				this.gameState = state;
				if (message.hostTime !== null) {
					this.hostTimeOffset = message.hostTime - Date.now();
				}
				this.status = 'connected';
				this.statusMessage = t('net.connectedToHost');
				this.bump();
			} catch (error) {
				this.log(`Could not apply game state: ${String(error)}`);
			}
			return;
		}

		if (message.type === dataMessageType.REQUEST_DIMENSIONS) {
			const course = new Course([
				PhoneCoordinates.fromWidthHeight(window.innerWidth, window.innerHeight)
			]);
			this.rtc?.sendMessage(
				new DataMessage(dataMessageType.SEND_DIMENSIONS, {
					course: course.toObject()
				})
			);
		}
	}

	private updateDeviceIndex(value: number | null): void {
		this.deviceIndex = value;
		try {
			localStorage.setItem(DEVICE_INDEX_STORAGE, String(value));
		} catch {
			/* ignore */
		}
		if (this.gameState) this.gameState.deviceIndex = value;
		this.bump();
	}

	private getHostTime(): number {
		return Date.now() + this.hostTimeOffset;
	}

	// --- rendering -----------------------------------------------------------

	private startRenderLoop(): void {
		if (this.frameRequest !== null) return;
		const loop = () => {
			if (this.destroyed) return;
			this.renderFrame();
			this.frameRequest = window.requestAnimationFrame(loop);
		};
		this.frameRequest = window.requestAnimationFrame(loop);
	}

	private renderFrame(): void {
		if (!this.canvas || !this.context) return;
		const green = this.rtc?.getStatus().color === 'green';
		if (!green || !this.gameState) {
			this.canvas.style.display = 'none';
			document.body.style.overflow = 'visible';
			return;
		}
		this.canvas.style.display = '';

		try {
			this.gameState.updatePhysics(this.getHostTime());
		} catch (error) {
			this.log(`[physics] ${String(error)}`);
		}

		try {
			Renderer.updateCanvasSize(this.context);
			this.gameState.referenceCanvasSize.set(this.canvas.width, this.canvas.height);
			Renderer.render(this.gameState, this.context, this.getRenderTouchInfo());
		} catch (error) {
			this.log(`[render] ${String(error)}`);
		}
	}

	private getRenderTouchInfo(): TouchInfo {
		const copy = { ...this.touchInfo };
		if (this.renderCurrPos === null && this.touchInfo.currPos) {
			this.renderCurrPos = this.touchInfo.currPos.copy();
		}
		if (this.renderHoverPos === null && this.touchInfo.gestureHoverPos) {
			this.renderHoverPos = this.touchInfo.gestureHoverPos.copy();
		}
		if (this.renderCurrPos && this.touchInfo.currPos) {
			this.renderCurrPos = this.renderCurrPos.lerp(this.touchInfo.currPos, 0.3);
			copy.currPos = this.renderCurrPos.copy();
		}
		if (this.renderHoverPos && this.touchInfo.gestureHoverPos) {
			this.renderHoverPos = this.renderHoverPos.lerp(this.touchInfo.gestureHoverPos, 0.3);
			copy.gestureHoverPos = this.renderHoverPos.copy();
		}
		return copy;
	}

	private attachCanvasListeners(): void {
		if (!this.canvas) return;
		this.canvas.addEventListener('pointerdown', this.onPointerDown);
		this.canvas.addEventListener('pointermove', this.onPointerMove);
		this.canvas.addEventListener('pointerup', this.onPointerUp);
		this.canvas.addEventListener('pointercancel', this.onPointerCancel);
		this.canvas.addEventListener('click', this.onCanvasClick);
	}

	private detachCanvasListeners(): void {
		if (!this.canvas) return;
		this.canvas.removeEventListener('pointerdown', this.onPointerDown);
		this.canvas.removeEventListener('pointermove', this.onPointerMove);
		this.canvas.removeEventListener('pointerup', this.onPointerUp);
		this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
		this.canvas.removeEventListener('click', this.onCanvasClick);
	}

	private pointerPosition(event: PointerEvent): Vector2d {
		const canvas = this.canvas;
		if (!canvas) return new Vector2d();
		const rect = canvas.getBoundingClientRect();
		const width = canvas.width || rect.width || window.innerWidth;
		const height = canvas.height || rect.height || window.innerHeight;
		return new Vector2d(
			((event.clientX - rect.left) / Math.max(rect.width, 1)) * width,
			((event.clientY - rect.top) / Math.max(rect.height, 1)) * height
		);
	}

	private onPointerDown = (event: PointerEvent): void => {
		if (!this.gameState || !this.rtc) return;
		try {
			this.canvas?.setPointerCapture(event.pointerId);
		} catch {
			/* not critical */
		}
		this.onTouchStart(this.pointerPosition(event));
	};

	private onPointerMove = (event: PointerEvent): void => {
		if (!this.gameState || !this.touchInfo.isDown) return;
		this.onTouchMove(this.pointerPosition(event));
	};

	private onPointerUp = (event: PointerEvent): void => {
		if (!this.gameState) return;
		const pos = this.pointerPosition(event);
		if (!this.touchInfo.isDown) {
			this.touchInfo.lastUpPos = pos;
			this.touchInfo.lastUpTime = Date.now();
			return;
		}
		this.onTouchEnd(pos);
	};

	private onPointerCancel = (): void => {
		this.touchInfo.isDown = false;
		this.touchInfo.currPos = null;
		this.touchInfo.focusedBall = null;
		this.touchInfo.focusedObject = null;
		this.touchInfo.draggingObject = false;
	};

	private onCanvasClick = (): void => {
		if (!this.fullscreenOnCanvasClick || !this.canvas) return;
		const legacyCanvas = this.canvas as HTMLCanvasElement & {
			msRequestFullscreen?: () => Promise<void>;
			mozRequestFullScreen?: () => Promise<void>;
			webkitRequestFullscreen?: () => Promise<void>;
		};
		const webkitDocument = document as Document & { webkitFullscreenElement?: Element };
		if (document.fullscreenElement || webkitDocument.webkitFullscreenElement) {
			return;
		}
		if (legacyCanvas.requestFullscreen) {
			void legacyCanvas.requestFullscreen().catch(() => {});
		} else if (legacyCanvas.msRequestFullscreen) {
			void legacyCanvas.msRequestFullscreen().catch(() => {});
		} else if (legacyCanvas.mozRequestFullScreen) {
			void legacyCanvas.mozRequestFullScreen().catch(() => {});
		} else if (legacyCanvas.webkitRequestFullscreen) {
			void legacyCanvas.webkitRequestFullscreen().catch(() => {});
		}
		void this.requestWakeLock();
	};

	// --- touch interactions --------------------------------------------------

	private clampToEdges(pos: Vector2d): Vector2d {
		if (!this.canvas) return pos;
		return pos.clampX([0, this.canvas.width], 100).clampY([0, this.canvas.height], 100);
	}

	private onTouchStart(pos: Vector2d): void {
		if (!this.gameState) return;
		this.touchInfo.isDown = true;
		this.touchInfo.currPos = pos;
		this.renderCurrPos = null;
		this.touchInfo.lastDownPos = pos.copy();
		this.touchInfo.lastDownTime = Date.now();

		if (this.gameState.phase === gamePhase.ConstructionCustom) {
			this.touchInfo.currPos = this.clampToEdges(pos);
			this.touchInfo.lastDownPos = this.touchInfo.currPos.copy();
		} else if (isPlayingPhase(this.gameState.phase)) {
			this.onBallDown();
		} else if (this.gameState.phase === gamePhase.Placing) {
			this.onObjectDown();
		}
	}

	private onTouchMove(pos: Vector2d): void {
		if (!this.gameState) return;
		this.touchInfo.currPos = pos;
		if (this.gameState.phase === gamePhase.ConstructionCustom) {
			this.touchInfo.currPos = this.clampToEdges(pos);
		} else if (this.gameState.phase === gamePhase.Placing) {
			this.onPlaceTouchMove();
		}
	}

	private onTouchEnd(pos: Vector2d): void {
		if (!this.gameState) return;
		this.touchInfo.isDown = false;
		this.touchInfo.currPos = null;
		this.touchInfo.lastUpPos = pos;
		this.touchInfo.lastUpTime = Date.now();

		if (this.gameState.phase === gamePhase.ConstructionCustom) {
			this.touchInfo.lastUpPos = this.clampToEdges(pos);
			this.onConstructionTouchEvent();
		} else if (this.gameState.phase === gamePhase.Placing) {
			this.onPlaceTouchEvent();
		} else if (isPlayingPhase(this.gameState.phase)) {
			this.onKickBallTouchEvent();
		}

		this.touchInfo.focusedBall = null;
		this.touchInfo.draggingObject = false;
	}

	private onBallDown(): void {
		if (!this.gameState || !this.touchInfo.currPos) return;
		const boardPos = this.gameState.screenPosToBoardPos(this.touchInfo.currPos);
		let smallestDistance = Infinity;
		let closestBall: Ball | null = null;
		for (const ball of this.gameState.board.balls) {
			if (ball.isInMovement() || !ball.active || ball.inHole) continue;
			const distance = ball.pos.distance(boardPos);
			if (distance < smallestDistance) {
				smallestDistance = distance;
				closestBall = ball;
			}
		}
		if (smallestDistance < 100) this.touchInfo.focusedBall = closestBall;
	}

	private onKickBallTouchEvent(): void {
		const gameState = this.gameState;
		const ball = this.touchInfo.focusedBall;
		if (!gameState || !ball || !this.touchInfo.lastDownPos || !this.touchInfo.lastUpPos) {
			return;
		}
		if (this.touchInfo.lastDownPos.distance(this.touchInfo.lastUpPos) < 10) return;

		const ballPos = gameState.boardPosToScreenPos(ball.pos);
		const strength = Math.min(
			(ballPos.distance(this.touchInfo.lastUpPos) * 0.3) /
				Math.max(gameState.combinedScalingFactor, 0.0001),
			70
		);
		const touchUpBoardPos = gameState.screenPosToBoardPos(this.touchInfo.lastUpPos);
		const direction = ball.pos.sub(touchUpBoardPos).normalized.scale(-strength);

		this.rtc?.sendMessage(
			new DataMessage(dataMessageType.KICK_BALL, {
				direction: direction.toObject(),
				ballUid: ball.uid
			})
		);

		if (gameState.mode === 'tournament') gameState.onTournamentKick(ball);
		ball.kick(direction);
	}

	private onObjectDown(): void {
		if (!this.gameState || !this.touchInfo.currPos) return;
		if (
			this.touchInfo.focusedObject &&
			this.gameState
				.boardPosToScreenPos(this.touchInfo.focusedObject.dragCorner)
				.distance(this.touchInfo.currPos) < 20
		) {
			this.touchInfo.draggingObject = true;
		} else {
			const boardPos = this.gameState.screenPosToBoardPos(this.touchInfo.currPos);
			const closestObject = this.gameState.board.getClosestObject(boardPos);
			this.touchInfo.focusedObject =
				closestObject && closestObject.intersects(boardPos) ? closestObject : null;
		}
		if (this.gameState.placingObjectType === golfObjectType.Eraser) {
			this.onPlaceTouchMove();
		}
	}

	private onPlaceTouchMove(): void {
		const gameState = this.gameState;
		if (!gameState || !this.touchInfo.currPos) return;

		if (gameState.placingObjectType === golfObjectType.Eraser) {
			const eraserPos = gameState.screenPosToBoardPos(this.touchInfo.currPos);
			const hitObject = gameState.board.objects.find((object) => object.intersects(eraserPos));
			if (!hitObject) return;
			gameState.board.objects = gameState.board.objects.filter(
				(object) => object.uid !== hitObject.uid
			);
			this.rtc?.sendMessage(new DataMessage(dataMessageType.REMOVE_OBJECT, { uid: hitObject.uid }));
			return;
		}

		const object = this.touchInfo.focusedObject;
		if (!object) return;
		if (this.touchInfo.draggingObject) {
			const objectPos = gameState.boardPosToScreenPos(object.pos);
			const angle = objectPos.angleTo(this.touchInfo.currPos);
			const angleOffset = Math.PI / 2 + Math.atan(object.size.x / object.size.y);
			const boardAngle = gameState.screenAngleToBoardAngle(angle + angleOffset);
			object.angle = snapAngle(boardAngle);
			if (object.resizable) {
				object.radius =
					(objectPos.distance(this.touchInfo.currPos) / 1.2) * gameState.combinedScalingFactor;
			}
		} else {
			object.pos = gameState.screenPosToBoardPos(this.touchInfo.currPos);
		}
	}

	private onPlaceTouchEvent(): void {
		const gameState = this.gameState;
		if (!gameState) return;
		if (gameState.placingObjectType === golfObjectType.Eraser) return;

		if (this.touchInfo.focusedObject) {
			this.rtc?.sendMessage(
				new DataMessage(dataMessageType.CHANGE_OBJECT, {
					object: this.touchInfo.focusedObject.toObject()
				})
			);
			return;
		}

		if (
			!this.touchInfo.lastUpPos ||
			!this.touchInfo.lastDownPos ||
			this.touchInfo.lastDownPos.distance(this.touchInfo.lastUpPos) > 10
		) {
			return;
		}
		const template = placableObjects.find((object) => object.type === gameState.placingObjectType);
		if (!template) return;
		const placedObject = template.copy();
		placedObject.uid = Math.random().toString().slice(2);
		placedObject.pos = gameState.screenPosToBoardPos(this.touchInfo.lastDownPos);
		this.rtc?.sendMessage(
			new DataMessage(dataMessageType.PLACE_OBJECT, {
				object: placedObject.toObject()
			})
		);
	}

	private onConstructionTouchEvent(): void {
		if (!this.canvas || !this.touchInfo.lastUpPos || !this.touchInfo.lastDownPos) return;
		const p1 = this.touchInfo.lastDownPos;
		const p2 = this.touchInfo.lastUpPos;
		const lieOnSameEdge =
			(p1.x === 0 && p1.x === p2.x) ||
			(p1.y === 0 && p1.y === p2.y) ||
			(p1.x === this.canvas.width && p1.x === p2.x) ||
			(p1.y === this.canvas.height && p1.y === p2.y);
		if (p1.distance(p2) < 100 || !lieOnSameEdge) return;

		const line = new ConstructionLine(p1, p2);
		const phone = PhoneCoordinates.fromWidthHeight(this.canvas.width, this.canvas.height);
		this.rtc?.sendMessage(
			new DataMessage(dataMessageType.CONSTRUCTION_LINE, {
				line: line.toObject(),
				phone: phone.toObject()
			})
		);
	}

	// --- orientation ---------------------------------------------------------

	private requestMotionPermission = async (): Promise<void> => {
		if (typeof DeviceOrientationEvent === 'undefined') return;
		const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
			requestPermission?: () => Promise<'granted' | 'denied'>;
		};
		try {
			if (orientation.requestPermission) {
				const permission = await orientation.requestPermission();
				if (permission !== 'granted') {
					this.log('Motion permission denied');
				}
			}
		} catch {
			this.log('Could not request motion permission');
		}
	};

	private onDeviceOrientation = (event: DeviceOrientationEvent): void => {
		if (event.gamma == null || event.beta == null) return;
		let beta = event.beta;
		if (beta > 90) beta -= 180;
		else if (beta < -90) beta += 180;
		const gamma = event.gamma;
		const tilt = new Vector2d(gamma, beta);
		tilt.x = Math.round(tilt.x / 0.9) / 100;
		tilt.y = Math.round(tilt.y / 0.9) / 100;
		this.tilt.tilt = tilt;

		if (tilt.distance(this.tilt.previousSteadyTilt) >= 0.05) {
			this.tilt.lastSignificantMoveTime = Date.now();
			this.tilt.previousSteadyTilt = tilt.copy();
			this.tilt.hasChangedFlag = true;
		}
	};

	private startOrientationLoop(): void {
		if (this.orientationTimer !== null) return;
		this.orientationTimer = window.setInterval(() => {
			const steady = Date.now() - this.tilt.lastSignificantMoveTime > 1000;
			if (steady && this.tilt.hasChangedFlag && this.rtc) {
				this.rtc.sendMessage(
					new DataMessage(dataMessageType.DEVICE_ORIENTATION, {
						x: this.tilt.previousSteadyTilt.x,
						y: this.tilt.previousSteadyTilt.y,
						deviceIndex: this.gameState?.deviceIndex ?? this.deviceIndex
					})
				);
				this.tilt.hasChangedFlag = false;
			}
		}, 3000);
	}

	// --- hand controls -------------------------------------------------------

	private setupHandControls(): void {
		const hand = this.handControls;
		hand.onError = (message) => {
			this.handError = message;
			this.handActive = false;
		};
		hand.onNonDragMove((_screenPos, normalizedPos) => {
			this.touchInfo.gestureHoverPos = normalizedPos
				.scaleX(window.innerWidth)
				.scaleY(window.innerHeight);
			this.touchInfo.gestureHoverPosTime = Date.now();
		});
		hand.onDragStart((pos) => this.onHandDragStart(pos));
		hand.onDragMove((pos) => this.onHandDragMove(pos));
		hand.onDragEnd(() => this.onHandDragEnd());
		hand.onDragCancel(() => this.onHandDragCancel());
	}

	private startHandControlLoop(): void {
		if (this.handTimer !== null) return;
		this.handTimer = window.setInterval(() => this.updateHandControlState(), 333);
	}

	private isThereABallToHandControl(): boolean {
		const state = this.gameState;
		if (!state || !isPlayingPhase(state.phase)) return false;
		if (state.mode === 'sandbox') {
			return state.deviceIndex === 1 && state.board.balls.some((ball) => !ball.inHole);
		}
		if (state.mode === 'tournament') {
			const ball = state.tournamentBall;
			return Boolean(
				ball && !ball.isInMovement() && !ball.inHole && state.thisPhone?.containsPos(ball.pos)
			);
		}
		return false;
	}

	private updateHandControlState(): void {
		const state = this.gameState;
		if (!state) return;
		const shouldUseCamera = state.cameraControlsActive && this.isThereABallToHandControl();
		if (shouldUseCamera && !this.handControls.cameraActive && !this.handControls.cameraFailed) {
			this.handActive = true;
			this.handError = '';
			void this.handControls.startCamera().catch((error) => {
				this.handActive = false;
				this.handError = t('client.cameraPermission');
				this.log(`Camera unavailable: ${String(error)}`);
			});
		} else if (
			!shouldUseCamera &&
			(this.handControls.cameraActive || this.handControls.cameraFailed)
		) {
			this.handControls.stopCamera();
			this.handActive = false;
			this.handError = '';
		}
	}

	private onHandDragStart(pos: Vector2d): void {
		const state = this.gameState;
		if (!state || !isPlayingPhase(state.phase)) return;
		let ball: Ball | null = null;
		if (state.mode === 'sandbox' && state.deviceIndex === 1) {
			ball = state.board.balls[0] ?? null;
		} else if (state.mode === 'tournament') {
			const candidate = state.tournamentBall;
			if (
				candidate &&
				!candidate.isInMovement() &&
				!candidate.inHole &&
				state.thisPhone?.containsPos(candidate.pos)
			) {
				ball = candidate;
			}
		}
		if (!ball) return;

		this.handDraggingBallUid = ball.uid;
		this.handDragStartPos = pos.copy();
		this.handDragPos = pos.copy();
		const ballScreenPos = state.boardPosToScreenPos(ball.pos);
		this.touchInfo.gestureHoverPos = ballScreenPos;
		this.touchInfo.gestureHoverPosTime = Date.now();
		this.onTouchStart(ballScreenPos);
	}

	private onHandDragMove(pos: Vector2d): void {
		const state = this.gameState;
		if (!state || !this.handDraggingBallUid || !this.handDragStartPos) return;
		const ball = state.board.balls.find((candidate) => candidate.uid === this.handDraggingBallUid);
		if (!ball) return;
		const ballScreenPos = state.boardPosToScreenPos(ball.pos);
		const relativePos = pos.sub(this.handDragStartPos).scale(2).add(ballScreenPos);
		this.handDragPos = relativePos.copy();
		this.onTouchMove(relativePos);
	}

	private onHandDragEnd(): void {
		const state = this.gameState;
		if (!state || !this.handDraggingBallUid || !this.handDragPos) return;
		this.onTouchEnd(this.handDragPos);
		this.handDraggingBallUid = null;
		this.handDragStartPos = null;
		this.handDragPos = null;
	}

	private onHandDragCancel(): void {
		const state = this.gameState;
		if (!state || !this.handDraggingBallUid) return;
		const ball = state.board.balls.find((candidate) => candidate.uid === this.handDraggingBallUid);
		if (ball) this.onTouchEnd(state.boardPosToScreenPos(ball.pos));
		this.handDraggingBallUid = null;
		this.handDragStartPos = null;
		this.handDragPos = null;
	}

	// --- misc ----------------------------------------------------------------

	private requestWakeLock = async (): Promise<void> => {
		await this.noSleep.enable();
	};

	private log(message: string): void {
		const time = new Date().toLocaleTimeString();
		this.logLines = [...this.logLines.slice(-199), `[${time}] ${message}`];
	}

	private bump(): void {
		this.revision++;
	}

	private beforeUnload = (event: BeforeUnloadEvent): void => {
		event.preventDefault();
		event.returnValue = t('net.leavingWarning');
	};
}
