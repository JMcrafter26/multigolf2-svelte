import QRCode from 'qrcode';
import { Board } from '$lib/game/board';
import { BoardGenerator } from '$lib/game/board-generator';
import { BoardRenderer } from '$lib/game/board-renderer';
import { audioEngine } from '$lib/game/audio';
import {
	gameMode,
	gamePhase,
	GameState,
	isPlayingPhase,
	Player,
	type GameMode
} from '$lib/game/gamestate';
import { golfObjectType, GolfObject, placableObjects } from '$lib/game/objects';
import { Course, ConstructionLine, PhoneCoordinates } from '$lib/game/phone-coordinates';
import { ScoreboardMaker } from '$lib/game/scoreboard';
import { Renderer } from '$lib/game/renderer';
import { t } from '$lib/i18n/state.svelte';
import { Vector2d } from '$lib/game/vector';
import { apiUrl } from '$lib/api';
import { DataMessage, dataMessageType } from '$lib/net/protocol';
import { RtcHost, RtcHostManager, type RtcStatusColor } from '$lib/net/rtc';

export interface LayoutChoice {
	board: Board;
	image: string;
}

export interface ConnectionView {
	index: number;
	color: RtcStatusColor;
	message: string;
}

export interface ToastMessage {
	text: string;
	kind: 'info' | 'error' | 'success';
}

const MAX_NAME_LENGTH = 30;

export class HostController {
	revision = $state(0);
	ready = $state(false);
	clientUrl = $state('');
	qrDataUrl = $state('');
	logLines = $state<string[]>([]);
	connections = $state<ConnectionView[]>([]);
	layoutChoices = $state<LayoutChoice[]>([]);
	scoreboardUrl = $state('');
	toast = $state<ToastMessage | null>(null);
	feedbackText = $state('');
	feedbackBusy = $state(false);
	layoutGenerating = $state(false);
	soundsEnabled = $state(audioEngine.soundsEnabled);
	speechEnabled = $state(audioEngine.speechEnabled);

	gameState: GameState;
	rtc: RtcHostManager | null = null;
	boardCanvas: HTMLCanvasElement | null = null;
	boardContext: CanvasRenderingContext2D | null = null;

	private uiTimer: number | null = null;
	private renderTimer: number | null = null;
	private physicsFrame: number | null = null;
	private toastTimeout: number | null = null;
	private layoutTimeout: number | null = null;
	private scoreSignature = '';
	private connectionSignature = '';
	private destroyed = false;

	constructor() {
		this.gameState = new GameState(gamePhase.Hello, gameMode.None, new Board());
		this.gameState.board.effects = audioEngine;
		this.addBeforeUnload();
	}

	get phase(): number {
		void this.revision;
		return this.gameState.phase;
	}

	get mode(): GameMode {
		void this.revision;
		return this.gameState.mode;
	}

	get players(): Player[] {
		void this.revision;
		return this.gameState.players;
	}

	get playerNames(): string[] {
		void this.revision;
		return this.gameState.players.map((player) => player.name);
	}

	get tournamentBuilderName(): string {
		void this.revision;
		return this.gameState.tournamentBuilder?.name ?? '';
	}

	get tournamentActiveName(): string {
		void this.revision;
		return this.gameState.tournamentActivePlayer?.name ?? '';
	}

	get tournamentRound(): number {
		void this.revision;
		return Math.min(this.gameState.tournamentBuilderIndex + 1, Math.max(this.players.length, 1));
	}

	get tournamentMaxKicks(): number {
		void this.revision;
		return this.gameState.tournamentMaxKicks;
	}

	get duellActiveName(): string {
		void this.revision;
		return this.gameState.duellActivePlayer?.name ?? '';
	}

	get duellInactiveName(): string {
		void this.revision;
		return this.gameState.duellInactivePlayer?.name ?? '';
	}

	get duellWinnerName(): string {
		void this.revision;
		return this.gameState.duellWinner?.name ?? '';
	}

	get cameraControlsActive(): boolean {
		void this.revision;
		return this.gameState.cameraControlsActive;
	}

	get deviceGravityEnabled(): boolean {
		void this.revision;
		return this.gameState.board.deviceGravityEnabled;
	}

	get ballCollisionsEnabled(): boolean {
		void this.revision;
		return this.gameState.board.ballCollisionEnabled;
	}

	get placingObjectType(): string {
		void this.revision;
		return this.gameState.placingObjectType;
	}

	get visiblePlacableObjects() {
		void this.revision;
		return placableObjects.filter((object) => object.visibility(this.gameState));
	}

	get roomCode(): string {
		void this.revision;
		return this.rtc?.poolUid ?? '';
	}

	get connectedCount(): number {
		return this.connections.length;
	}

	get hasCourse(): boolean {
		void this.revision;
		return this.gameState.board.course.phones.length > 0;
	}

	get canKeepLayout(): boolean {
		void this.revision;
		return this.gameState.board.course.phones.length > 0;
	}

	get placementCount(): number {
		void this.revision;
		return this.gameState.board.objects.length;
	}

	get isPlaying(): boolean {
		void this.revision;
		return isPlayingPhase(this.gameState.phase);
	}

	get statusLabel(): string {
		void this.revision;
		return '';
	}

	async init(): Promise<void> {
		await Renderer.load();
		this.ready = true;
		this.startTimers();
		this.bump();
	}

	attachCanvas(canvas: HTMLCanvasElement): void {
		this.boardCanvas = canvas;
		this.boardContext = canvas.getContext('2d');
		this.renderBoard();
	}

	async start(): Promise<void> {
		this.changePhase(gamePhase.Hello, true);
	}

	async startConnectionProcess(force = false): Promise<void> {
		if (!force && this.phase >= gamePhase.Connecting) return;
		this.changePhase(gamePhase.Connecting);
		this.refreshConnections();

		if (!this.rtc) {
			this.rtc = new RtcHostManager({
				logFunction: (message) => this.log(message),
				onClientUrlAvailable: (url) => this.onClientUrlAvailable(url),
				onConnectionsChanged: () => this.refreshConnections(),
				onDataMessage: (message, connection) => this.onDataMessage(message, connection),
				allowConnectionOverride: () => this.phase === gamePhase.Connecting,
				allowNewConnections: () => this.phase === gamePhase.Connecting
			});
		}

		try {
			await this.rtc.start();
			void fetch(apiUrl('count_start.php')).catch(() => {});
		} catch (error) {
			this.log(`❌ Could not open lobby: ${String(error)}`);
			this.notify(t('net.connectionFailed'), 'error');
		}
	}

	async retryLobby(): Promise<void> {
		this.rtc?.stop();
		this.rtc = null;
		this.clientUrl = '';
		this.qrDataUrl = '';
		this.changePhase(gamePhase.Connecting, true);
		await this.startConnectionProcess(true);
	}

	finishPlayers(): void {
		if (this.phase !== gamePhase.Connecting) return;
		if (!this.rtc?.connections.length) {
			this.notify(t('host.noDevices'), 'error');
			return;
		}
		this.changePhase(gamePhase.ConfigGame);
		this.syncGamestate();
	}

	changeModeChoice(): void {
		this.changePhase(gamePhase.ModeChoice, true);
		this.scrollToTop();
	}

	chooseMode(mode: GameMode): void {
		if (this.phase !== gamePhase.ModeChoice) return;
		this.gameState.tournamentBuilderIndex = 0;
		this.gameState.mode = mode;
		this.gameState.board.objects = this.gameState.board.objects.filter(
			(object) =>
				object.type !== golfObjectType.DuellHole1 && object.type !== golfObjectType.DuellHole2
		);
		this.bump();

		if (mode === gameMode.Sandbox) {
			void this.startConnectionProcess();
		} else if (mode === gameMode.Tournament) {
			this.changePhase(gamePhase.PlayerSetupTournament);
		} else if (mode === gameMode.Duell) {
			this.changePhase(gamePhase.PlayerSetupDuell);
		}
	}

	registerPlayers(names: string[]): boolean {
		if (
			this.phase !== gamePhase.PlayerSetupDuell &&
			this.phase !== gamePhase.PlayerSetupTournament
		) {
			return false;
		}

		const cleaned = names.map((name) => name.trim()).filter(Boolean);
		if (cleaned.some((name) => name.length > MAX_NAME_LENGTH)) {
			const longName = cleaned.find((name) => name.length > MAX_NAME_LENGTH) ?? '';
			this.notify(t('host.nameTooLong', { name: longName.slice(0, MAX_NAME_LENGTH) }), 'error');
			return false;
		}

		if (this.mode === gameMode.Duell && cleaned.length !== 2) {
			this.notify(t('host.fillAllFields'), 'error');
			return false;
		}
		if (this.mode === gameMode.Tournament && cleaned.length === 0) {
			this.notify(t('host.fillOneName'), 'error');
			return false;
		}

		const lowerNames = new Set<string>();
		for (const name of cleaned) {
			const lower = name.toLowerCase();
			if (lowerNames.has(lower)) {
				this.notify(t('host.sameName'), 'error');
				return false;
			}
			lowerNames.add(lower);
		}

		this.gameState.players = cleaned.map((name) => new Player(name));
		this.bump();
		void this.startConnectionProcess();
		return true;
	}

	finishConfig(): void {
		if (this.phase !== gamePhase.ConfigGame) return;
		if (this.mode === gameMode.Tournament) {
			this.changePhase(gamePhase.TournamentExplanation);
		} else if (this.mode === gameMode.Duell) {
			this.changePhase(gamePhase.DuellExplanation);
		} else {
			void this.startGame();
		}
	}

	async startGame(): Promise<void> {
		this.ensureTimers();
		if (this.rtc?.connections.length === 1) {
			this.changePhase(gamePhase.Loading, true);
			this.syncGamestate();
			this.rtc.connections[0].sendMessage(new DataMessage(dataMessageType.REQUEST_DIMENSIONS));
			this.notify(t('host.waitingForHost'), 'info');
		} else {
			this.changePhase(gamePhase.ConstructionChoice, true);
			this.syncGamestate();
		}
		this.startPhysicsLoop();
		this.startRenderTimer();
	}

	async finishConstruction(): Promise<void> {
		if (
			this.phase !== gamePhase.ConstructionChoice &&
			this.phase !== gamePhase.ConstructionAuto &&
			this.phase !== gamePhase.ConstructionCustom
		) {
			return;
		}
		if (this.gameState.board.course.phones.length === 0) {
			this.notify(t('host.notConstructed'), 'error');
			return;
		}
		if (this.gameState.board.course.getOverlaps().length > 0) {
			if (!window.confirm(t('host.courseOverlap'))) return;
		}

		this.gameState.placingObjectType = golfObjectType.Start;
		this.changePhase(gamePhase.Placing);
		this.syncGamestate();
	}

	selectPlacingObject(type: string): void {
		if (this.phase !== gamePhase.Placing) return;
		this.gameState.placingObjectType = type;
		this.bump();
		this.syncGamestate();
	}

	async placeRandomObjects(
		numObjects: number,
		objectType: string = golfObjectType.Lava
	): Promise<void> {
		if (this.phase !== gamePhase.Placing) return;
		await BoardGenerator.placeObjectsRandomly(this.gameState.board, {
			numObjects,
			objectType:
				objectType === golfObjectType.Cannon
					? golfObjectType.Cannon
					: objectType === golfObjectType.GravityBox
						? golfObjectType.GravityBox
						: golfObjectType.Lava
		});
		this.bump();
		this.syncGamestate();
	}

	finishPlacing(): void {
		if (this.phase !== gamePhase.Placing) return;
		if (!this.gameState.board.startPos) {
			this.notify(t('host.noStart'), 'error');
			return;
		}
		if (this.gameState.board.endPositions.length === 0) {
			this.notify(t('host.noHole'), 'error');
			return;
		}
		if (this.mode === gameMode.Duell) {
			if (
				!this.gameState.board.objects.some((object) => object.type === golfObjectType.DuellHole1)
			) {
				this.notify(t('host.noDuellHole', { name: this.duellActiveName }), 'error');
				return;
			}
			if (
				!this.gameState.board.objects.some((object) => object.type === golfObjectType.DuellHole2)
			) {
				this.notify(t('host.noDuellHole', { name: this.duellInactiveName }), 'error');
				return;
			}
		}
		this.startPlaying();
	}

	startPlaying(): void {
		if (this.phase >= gamePhase.__LOWEST_PLAYING || this.phase === gamePhase.Placing) {
			if (this.phase !== gamePhase.Placing) return;
		}

		if (this.mode === gameMode.Duell) {
			this.changePhase(gamePhase.PlayingDuell);
			this.gameState.startDuellRound();
		} else if (this.mode === gameMode.Sandbox) {
			this.changePhase(gamePhase.PlayingSandbox);
			this.gameState.startSandboxRound();
		} else if (this.mode === gameMode.Tournament) {
			this.changePhase(gamePhase.PlayingTournament);
			this.gameState.startTournamentRound();
		}
		this.syncGamestate();
		this.bump();
	}

	back(): void {
		switch (this.phase) {
			case gamePhase.ModeChoice:
				this.changePhase(gamePhase.Hello, true);
				break;
			case gamePhase.PlayerSetupTournament:
			case gamePhase.PlayerSetupDuell:
				this.changePhase(gamePhase.ModeChoice, true);
				break;
			case gamePhase.Connecting:
				if (this.mode === gameMode.Tournament) {
					this.changePhase(gamePhase.PlayerSetupTournament, true);
				} else if (this.mode === gameMode.Duell) {
					this.changePhase(gamePhase.PlayerSetupDuell, true);
				} else {
					this.changePhase(gamePhase.ModeChoice, true);
				}
				break;
			case gamePhase.ConfigGame:
				this.changePhase(gamePhase.Connecting, true);
				break;
			case gamePhase.TournamentExplanation:
			case gamePhase.DuellExplanation:
				this.changePhase(gamePhase.ConfigGame, true);
				break;
			case gamePhase.ConstructionChoice:
				if (this.mode === gameMode.Tournament) {
					this.changePhase(gamePhase.TournamentExplanation, true);
				} else if (this.mode === gameMode.Duell) {
					this.changePhase(gamePhase.DuellExplanation, true);
				} else {
					this.changePhase(gamePhase.ConfigGame, true);
				}
				break;
			case gamePhase.ConstructionAuto:
			case gamePhase.ConstructionCustom:
				this.changePhase(gamePhase.ConstructionChoice, true);
				break;
			case gamePhase.Placing:
				if (this.rtc?.connections.length === 1) {
					if (this.mode === gameMode.Tournament) {
						this.changePhase(gamePhase.TournamentExplanation, true);
					} else if (this.mode === gameMode.Duell) {
						this.changePhase(gamePhase.DuellExplanation, true);
					} else {
						this.changePhase(gamePhase.ConfigGame, true);
					}
				} else {
					this.changePhase(gamePhase.ConstructionChoice, true);
				}
				break;
			case gamePhase.ShowingResultsOfDuell:
			case gamePhase.ShowingResultsOfTournament:
				this.playAgain();
				break;
			default:
				break;
		}
		this.scrollToTop();
	}

	startAutoLayout(): void {
		// changePhase schedules the (single) template generation for the
		// ConstructionAuto phase.
		this.changePhase(gamePhase.ConstructionAuto, true);
	}

	startCustomLayout(): void {
		this.gameState.board.resetConfig();
		this.changePhase(gamePhase.ConstructionCustom, true);
		this.syncGamestate();
	}

	startFreshLayout(): void {
		this.gameState.board.resetConfig();
		this.startAutoLayout();
	}

	keepLayout(): void {
		void this.finishConstruction();
	}

	chooseLayout(index: number): void {
		const choice = this.layoutChoices[index];
		if (!choice) return;
		this.gameState.board = choice.board.copy();
		this.gameState.board.effects = audioEngine;
		this.bump();
		void this.finishConstruction();
	}

	async generateBoardTemplates(): Promise<void> {
		if (this.phase !== gamePhase.ConstructionAuto) return;
		this.layoutGenerating = false;
		if (!this.ready) {
			await new Promise((resolve) => setTimeout(resolve, 300));
			if (!this.ready) return;
		}
		const sizes =
			this.rtc?.connections
				.map((connection) => connection.clientDisplaySize)
				.filter((size): size is Vector2d => size !== null) ?? [];
		if (!sizes.length) {
			this.notify(t('host.constructionWaiting'), 'info');
			return;
		}

		const generator = new BoardGenerator(sizes);
		const choices: LayoutChoice[] = [];
		for (let i = 0; i < 3; i++) {
			try {
				const board = generator.generate();
				choices.push({ board, image: this.renderLayoutPreview(board) });
			} catch (error) {
				this.log(`Could not generate layout: ${String(error)}`);
			}
			if (choices.length === 0) break;
		}
		this.layoutChoices = choices;
		this.layoutGenerating = false;
		this.bump();
	}

	switchCameraControls(): void {
		this.gameState.cameraControlsActive = !this.gameState.cameraControlsActive;
		this.bump();
		this.syncGamestate();
	}

	toggleDeviceGravity(): void {
		this.gameState.board.deviceGravityEnabled = !this.gameState.board.deviceGravityEnabled;
		this.bump();
		this.syncGamestate();
	}

	toggleBallCollisions(): void {
		this.gameState.board.ballCollisionEnabled = !this.gameState.board.ballCollisionEnabled;
		this.bump();
		this.syncGamestate();
	}

	toggleSounds(): void {
		audioEngine.soundsEnabled = !audioEngine.soundsEnabled;
		this.soundsEnabled = audioEngine.soundsEnabled;
		void audioEngine.load();
	}

	toggleSpeech(): void {
		audioEngine.speechEnabled = !audioEngine.speechEnabled;
		this.speechEnabled = audioEngine.speechEnabled;
	}

	setMaxKicks(value: number): void {
		const parsed = Math.max(1, Math.min(100, Math.round(value)));
		this.gameState.tournamentMaxKicks = Number.isFinite(parsed) ? parsed : 10;
		this.bump();
		this.syncGamestate();
	}

	playAgain(): void {
		// The legacy implementation only jumped back to the mode choice and kept
		// the finished course, so it can still be reused ("keep layout") in the
		// next round.
		this.stopPhysicsLoop();
		this.changePhase(gamePhase.ModeChoice, true);
		this.scoreboardUrl = '';
		this.scoreSignature = '';
		this.layoutChoices = [];
		this.syncGamestate();
		this.scrollToTop();
	}

	spawnBall(): void {
		if (!this.isPlaying || this.mode !== gameMode.Sandbox) return;
		try {
			this.gameState.board.spawnBall();
			this.bump();
			this.syncGamestate();
		} catch (error) {
			this.log(`Could not spawn ball: ${String(error)}`);
		}
	}

	openLobbyLite(): void {
		this.changePhase(gamePhase.Connecting, true);
		this.scrollToTop();
	}

	async shareScoreboard(): Promise<void> {
		const source = this.scoreboardUrl || this.generateScoreboard();
		if (!source) return;
		try {
			const blob = await (await fetch(source)).blob();
			const file = new File([blob], 'multigolf-scoreboard.png', { type: blob.type });
			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({
					title: 'Multigolf Scoreboard',
					text: 'Our Multigolf results!',
					files: [file]
				});
				return;
			}
		} catch {
			/* fall through to download */
		}
		this.downloadScoreboard();
	}

	downloadScoreboard(): void {
		const source = this.scoreboardUrl || this.generateScoreboard();
		if (!source) return;
		const link = document.createElement('a');
		link.href = source;
		link.download = 'multigolf-scoreboard.png';
		link.click();
	}

	async sendFeedback(): Promise<void> {
		const text = this.feedbackText.trim();
		if (!text) {
			this.notify(t('host.fillAllFields'), 'error');
			return;
		}
		if (text.length > 1000) {
			this.notify(t('host.feedbackTooLong'), 'error');
			return;
		}
		if (this.feedbackBusy) return;
		this.feedbackBusy = true;
		try {
			const formData = new FormData();
			formData.append('message', text);
			const response = await fetch(apiUrl('give_feedback.php'), {
				method: 'POST',
				body: formData
			});
			const data = (await response.json()) as { ok?: boolean; error?: string };
			if (!data.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
			this.feedbackText = '';
			this.notify(t('host.thanksForFeedback'), 'success');
		} catch {
			this.notify(t('host.feedbackFailed'), 'error');
		} finally {
			this.feedbackBusy = false;
		}
	}

	notify(text: string, kind: ToastMessage['kind'] = 'info'): void {
		this.toast = { text, kind };
		if (this.toastTimeout !== null) window.clearTimeout(this.toastTimeout);
		this.toastTimeout = window.setTimeout(() => {
			this.toast = null;
			this.toastTimeout = null;
		}, 5000);
	}

	scrollToTop(): void {
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	destroy(): void {
		this.destroyed = true;
		this.stopPhysicsLoop();
		if (this.uiTimer !== null) window.clearInterval(this.uiTimer);
		if (this.renderTimer !== null) window.clearInterval(this.renderTimer);
		if (this.layoutTimeout !== null) window.clearTimeout(this.layoutTimeout);
		if (this.toastTimeout !== null) window.clearTimeout(this.toastTimeout);
		this.rtc?.stop();
		window.removeEventListener('beforeunload', this.beforeUnload);
		document.body.style.overflow = '';
	}

	// --- internals -----------------------------------------------------------

	private changePhase(newPhase: number, force = false): void {
		if (!force && this.gameState.phase >= newPhase) return;
		this.gameState.phase = newPhase;
		this.bump();

		if (newPhase === gamePhase.ConstructionCustom) {
			this.gameState.board.resetConfig();
		}
		if (newPhase === gamePhase.ConstructionAuto) {
			this.layoutChoices = [];
			this.layoutGenerating = true;
			if (this.layoutTimeout !== null) window.clearTimeout(this.layoutTimeout);
			this.layoutTimeout = window.setTimeout(() => void this.generateBoardTemplates(), 250);
		}
		if (newPhase === gamePhase.ConstructionChoice) {
			this.layoutChoices = [];
		}
		if (
			newPhase === gamePhase.ShowingResultsOfTournament ||
			newPhase === gamePhase.ShowingResultsOfDuell
		) {
			this.generateScoreboard();
		}
		if (newPhase === gamePhase.PlayingTournament) {
			this.generateScoreboard();
		}
	}

	private onClientUrlAvailable(url: string): void {
		this.clientUrl = url;
		const qrUrl = new URLSearchParams(location.search).has('debug') ? `${url}&nofullscreen` : url;
		void QRCode.toDataURL(qrUrl, { margin: 1, width: 420 })
			.then((dataUrl) => {
				this.qrDataUrl = dataUrl;
				if (new URLSearchParams(location.search).has('debug')) {
					this.log(`QR URL: ${qrUrl}`);
				}
			})
			.catch((error) => this.log(`Could not create QR code: ${String(error)}`));
		this.log(t('net.createdPool', { id: this.rtc?.poolUid ?? '' }));
	}

	private onDataMessage(message: DataMessage, rtc: RtcHost): void {
		const data = message.data as Record<string, unknown>;
		if (message.type === dataMessageType.PING) {
			const sizeChanged = rtc.receivePing(message);
			if (sizeChanged && this.phase === gamePhase.ConstructionAuto) {
				this.generateBoardTemplates();
			}
			this.refreshConnections();
			return;
		}

		if (
			this.phase === gamePhase.ConstructionCustom &&
			message.type === dataMessageType.CONSTRUCTION_LINE
		) {
			try {
				const line = ConstructionLine.fromObject(
					data.line as Parameters<typeof ConstructionLine.fromObject>[0]
				);
				const phone = PhoneCoordinates.fromObject(
					data.phone as Parameters<typeof PhoneCoordinates.fromObject>[0]
				);
				this.gameState.board.addConstructionLine(line, phone, Date.now(), rtc.index);
				this.bump();
				this.renderBoard();
				this.syncGamestate();
			} catch (error) {
				this.log(`Invalid construction line: ${String(error)}`);
			}
			return;
		}

		if (this.phase === gamePhase.Loading && message.type === dataMessageType.SEND_DIMENSIONS) {
			try {
				this.gameState.board.course = Course.fromObject(
					data.course as Parameters<typeof Course.fromObject>[0]
				);
				this.gameState.phase = gamePhase.ConstructionAuto;
				this.bump();
				void this.finishConstruction();
			} catch (error) {
				this.log(`Invalid dimensions: ${String(error)}`);
			}
			return;
		}

		if (this.phase === gamePhase.Placing && message.type === dataMessageType.PLACE_OBJECT) {
			const object = GolfObject.fromObject(
				data.object as Parameters<typeof GolfObject.fromObject>[0]
			);
			if (object.type === golfObjectType.Start) {
				this.gameState.board.objects = this.gameState.board.objects.filter(
					(candidate) => candidate.type !== golfObjectType.Start
				);
			}
			this.gameState.board.objects.push(object);
			this.bump();
			this.syncGamestate();
			return;
		}

		if (this.phase === gamePhase.Placing && message.type === dataMessageType.REMOVE_OBJECT) {
			this.gameState.board.objects = this.gameState.board.objects.filter(
				(object) => object.uid !== data.uid
			);
			this.bump();
			this.syncGamestate();
			return;
		}

		if (this.phase === gamePhase.Placing && message.type === dataMessageType.CHANGE_OBJECT) {
			const object = GolfObject.fromObject(
				data.object as Parameters<typeof GolfObject.fromObject>[0]
			);
			this.gameState.board.updateObject(object);
			this.bump();
			this.syncGamestate();
			return;
		}

		if (isPlayingPhase(this.phase) && message.type === dataMessageType.KICK_BALL) {
			const ball = this.gameState.board.balls.find((candidate) => candidate.uid === data.ballUid);
			if (ball) {
				if (this.gameState.mode === gameMode.Tournament) {
					this.gameState.onTournamentKick(ball);
				}
				const direction = Vector2d.fromObject(data.direction as { x: number; y: number });
				if (direction) ball.kick(direction);
				this.bump();
			} else {
				this.log(`Couldn't find ball with id ${String(data.ballUid)}`);
			}
			this.syncGamestate();
			return;
		}

		if (message.type === dataMessageType.DEVICE_ORIENTATION && isPlayingPhase(this.phase)) {
			const gravity = Vector2d.fromObject(data as unknown as { x: number; y: number });
			if (!gravity) return;
			if (Math.abs(gravity.x) < 0.1) gravity.x = 0;
			if (Math.abs(gravity.y) < 0.1) gravity.y = 0;
			const deviceIndex = Number(data.deviceIndex);
			const phone = this.gameState.board.course.phones[deviceIndex - 1];
			if (phone) {
				phone.gravity = gravity;
				this.syncGamestate();
			}
			return;
		}

		this.log(`Unknown message: ${message.type}`);
	}

	syncGamestate(connections?: RtcHost[]): void {
		const targets = connections ?? this.rtc?.connections ?? [];
		for (const connection of targets) {
			connection.sendMessage(
				new DataMessage(
					dataMessageType.GAMESTATE,
					this.gameState.toObject(connection.index) as unknown as Record<string, unknown>
				)
			);
		}
	}

	private startTimers(): void {
		if (this.destroyed) return;
		if (this.uiTimer !== null) return;
		this.uiTimer = window.setInterval(() => {
			this.refreshConnections();
			if (this.phase === gamePhase.Connecting) this.rtc?.removeLostConnections();
		}, 1000);
		this.startRenderTimer();
	}

	private ensureTimers(): void {
		this.startTimers();
	}

	private startRenderTimer(): void {
		if (this.renderTimer !== null) return;
		// The legacy implementation combined board rendering, the periodic
		// gamestate broadcast and the scoreboard refresh in one 500 ms timer.
		this.renderTimer = window.setInterval(() => {
			this.renderBoard();
			if (!this.gameState.board.balls.some((ball) => ball.isMoving())) {
				this.syncGamestate();
			}
			if (this.phase === gamePhase.PlayingTournament) this.generateScoreboard();
		}, 500);
	}

	private startPhysicsLoop(): void {
		if (this.physicsFrame !== null) return;
		const loop = () => {
			if (this.destroyed) return;
			try {
				if (this.gameState.update()) {
					this.bump();
					this.syncGamestate();
					this.generateScoreboardIfTournament();
				}
			} catch (error) {
				this.log(`Physics error: ${String(error)}`);
			}
			this.physicsFrame = window.requestAnimationFrame(loop);
		};
		this.physicsFrame = window.requestAnimationFrame(loop);
	}

	private stopPhysicsLoop(): void {
		if (this.physicsFrame !== null) {
			window.cancelAnimationFrame(this.physicsFrame);
			this.physicsFrame = null;
		}
	}

	private refreshConnections(): void {
		if (!this.rtc) {
			if (this.connections.length) {
				this.connections = [];
				this.connectionSignature = '';
				this.bump();
			}
			return;
		}
		const views = this.rtc.connections.map((connection) => {
			const status = connection.getStatus();
			return { index: connection.index, color: status.color, message: status.message };
		});
		const signature = JSON.stringify(views);
		if (signature !== this.connectionSignature) {
			this.connectionSignature = signature;
			this.connections = views;
			this.bump();
		}
	}

	private renderBoard(): void {
		if (!this.boardCanvas || !this.boardContext) return;
		if (!this.gameState.board.course.phones.length) {
			this.boardCanvas.style.display = 'none';
			return;
		}
		this.boardCanvas.style.display = 'block';
		try {
			BoardRenderer.render(this.gameState.board, this.boardContext, {
				drawConnectionLines:
					this.phase >= gamePhase.ConstructionChoice && this.phase <= gamePhase.Placing
			});
		} catch (error) {
			this.log(`Render error: ${String(error)}`);
		}
	}

	private renderLayoutPreview(board: Board): string {
		const canvas = document.createElement('canvas');
		canvas.width = 420;
		canvas.height = 300;
		canvas.style.cssText = 'position:fixed;left:-10000px;top:0;width:420px;height:300px;';
		document.body.appendChild(canvas);
		try {
			const context = canvas.getContext('2d');
			if (!context) return '';
			BoardRenderer.render(board, context, { drawConnectionLines: true });
			return canvas.toDataURL('image/png');
		} finally {
			canvas.remove();
		}
	}

	private generateScoreboard(): string {
		try {
			const signature = JSON.stringify(
				this.gameState.players.map((player) => [player.name, player.roundScores])
			);
			if (signature === this.scoreSignature && this.scoreboardUrl) return this.scoreboardUrl;
			this.scoreSignature = signature;
			this.scoreboardUrl = ScoreboardMaker.makeImg(this.gameState.players);
			return this.scoreboardUrl;
		} catch (error) {
			this.log(`Scoreboard error: ${String(error)}`);
			return '';
		}
	}

	private generateScoreboardIfTournament(): void {
		if (
			this.phase === gamePhase.PlayingTournament ||
			this.phase === gamePhase.ShowingResultsOfTournament
		) {
			this.generateScoreboard();
		}
	}

	private log(message: string): void {
		const time = new Date().toLocaleTimeString();
		this.logLines = [...this.logLines.slice(-199), `[${time}] ${message}`];
	}

	private bump(): void {
		this.revision++;
	}

	private beforeUnload = (event: BeforeUnloadEvent): string | undefined => {
		if (this.phase === gamePhase.Hello || this.destroyed) return undefined;
		event.preventDefault();
		return t('net.leavingWarning');
	};

	private addBeforeUnload(): void {
		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', this.beforeUnload);
		}
	}
}
