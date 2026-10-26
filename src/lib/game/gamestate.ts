import { Board, type BoardObject } from './board';
import { golfObjectType } from './objects';
import { Sprite } from './sprites';
import { Vector2d, type VectorLike } from './vector';

export const gamePhase = {
	None: -1,
	Hello: 0,
	ModeChoice: 1,
	PlayerSetupDuell: 2,
	PlayerSetupTournament: 3,
	Connecting: 4,
	ConfigGame: 5,
	TournamentExplanation: 6,
	DuellExplanation: 7,
	ConstructionChoice: 8,
	ConstructionAuto: 9,
	ConstructionCustom: 10,
	Loading: 11,
	Placing: 12,
	PlayingDuell: 13,
	PlayingSandbox: 14,
	PlayingTournament: 15,
	ShowingResultsOfTournament: 16,
	ShowingResultsOfDuell: 17,

	__LOWEST_PLAYING: 13,
	__LOWEST_SHOWING_RESULTS: 16,
	__MAX_VALUE: 18
} as const;

export type GamePhase = (typeof gamePhase)[
	| 'None'
	| 'Hello'
	| 'ModeChoice'
	| 'PlayerSetupDuell'
	| 'PlayerSetupTournament'
	| 'Connecting'
	| 'ConfigGame'
	| 'TournamentExplanation'
	| 'DuellExplanation'
	| 'ConstructionChoice'
	| 'ConstructionAuto'
	| 'ConstructionCustom'
	| 'Loading'
	| 'Placing'
	| 'PlayingDuell'
	| 'PlayingSandbox'
	| 'PlayingTournament'
	| 'ShowingResultsOfTournament'
	| 'ShowingResultsOfDuell'];

export function isPlayingPhase(phase: number): boolean {
	return (
		phase === gamePhase.PlayingDuell ||
		phase === gamePhase.PlayingSandbox ||
		phase === gamePhase.PlayingTournament
	);
}

export const gamePhaseNames: Record<number, string> = {
	[gamePhase.None]: 'none',
	[gamePhase.Hello]: 'hello',
	[gamePhase.ModeChoice]: 'mode-choice',
	[gamePhase.PlayerSetupDuell]: 'player-setup-duell',
	[gamePhase.PlayerSetupTournament]: 'player-setup-tournament',
	[gamePhase.Connecting]: 'connecting',
	[gamePhase.ConfigGame]: 'config-game',
	[gamePhase.TournamentExplanation]: 'tournament-explanation',
	[gamePhase.DuellExplanation]: 'duell-explanation',
	[gamePhase.ConstructionChoice]: 'construction-choice',
	[gamePhase.ConstructionAuto]: 'construction-auto',
	[gamePhase.ConstructionCustom]: 'construction-custom',
	[gamePhase.Loading]: 'loading',
	[gamePhase.Placing]: 'placing',
	[gamePhase.PlayingDuell]: 'playing-duell',
	[gamePhase.PlayingTournament]: 'playing-tournament',
	[gamePhase.PlayingSandbox]: 'playing-sandbox',
	[gamePhase.ShowingResultsOfTournament]: 'showing-results-of-tournament',
	[gamePhase.ShowingResultsOfDuell]: 'showing-results-of-duell'
};

export const gameMode = {
	Sandbox: 'sandbox',
	Tournament: 'tournament',
	Duell: 'duell',
	None: 'none'
} as const;

export type GameMode = (typeof gameMode)[keyof typeof gameMode];

export interface PlayerObject {
	name: string;
	roundScores: number[];
}

export class Player {
	name: string;
	roundScores: number[];

	constructor(name: string, roundScores: number[] = []) {
		this.name = name;
		this.roundScores = roundScores;
	}

	static fromObject(obj: PlayerObject): Player {
		// The legacy implementation accidentally passed obj.score as roundScores,
		// which produced a numeric value without the array methods used later.
		return new Player(obj.name, Array.isArray(obj.roundScores) ? obj.roundScores : []);
	}

	get score(): number {
		return this.roundScores.reduce((sum, score) => sum + score, 0);
	}

	toObject(): PlayerObject {
		return { name: this.name, roundScores: this.roundScores };
	}

	addRound(score: number): void {
		this.roundScores.push(score);
	}
}

export interface GameStateObject {
	phase: number;
	mode: GameMode;
	board: BoardObject;
	cameraControlsActive: boolean;
	players: PlayerObject[];
	index: number | null;
	placingObjectType: string;
	tournamentBuilderIndex: number;
	tournamentBallIndex: number;
	duellActivePlayerIndex: number;
	duellWinnerIndex: number | null;
	tournamentMaxKicks: number;
}

export class GameState {
	phase: number;
	mode: GameMode;
	board: Board;
	cameraControlsActive: boolean;
	players: Player[];
	deviceIndex: number | null;
	placingObjectType: string;
	tournamentBuilderIndex: number;
	tournamentBallIndex: number;
	duellActivePlayerIndex: number;
	duellWinnerIndex: number | null;
	tournamentMaxKicks: number;

	/** The client viewport used for coordinate conversions. */
	referenceCanvasSize = new Vector2d();

	constructor(
		phase: number,
		mode: GameMode,
		board: Board,
		cameraControlsActive = false,
		players: Player[] = [],
		deviceIndex: number | null = null,
		placingObjectType: string = golfObjectType.Start,
		tournamentBuilderIndex = 0,
		tournamentBallIndex = 0,
		duellActivePlayerIndex = 0,
		duellWinnerIndex: number | null = null,
		tournamentMaxKicks = 10
	) {
		this.phase = phase;
		this.mode = mode;
		this.board = board;
		this.cameraControlsActive = cameraControlsActive;
		this.players = players;
		this.deviceIndex = deviceIndex;
		this.placingObjectType = placingObjectType;
		this.tournamentBuilderIndex = tournamentBuilderIndex;
		this.tournamentBallIndex = tournamentBallIndex;
		this.duellActivePlayerIndex = duellActivePlayerIndex;
		this.duellWinnerIndex = duellWinnerIndex;
		this.tournamentMaxKicks = tournamentMaxKicks;
	}

	static fromObject(
		obj: GameStateObject,
		effects = undefined as Board['effects'] | undefined
	): GameState {
		return new GameState(
			obj.phase,
			obj.mode,
			Board.fromObject(obj.board, effects),
			obj.cameraControlsActive,
			obj.players.map((player) => Player.fromObject(player)),
			obj.index,
			obj.placingObjectType,
			obj.tournamentBuilderIndex,
			obj.tournamentBallIndex,
			obj.duellActivePlayerIndex,
			obj.duellWinnerIndex,
			obj.tournamentMaxKicks
		);
	}

	replaceText(text: string): string {
		if (this.mode === gameMode.Duell && this.players.length >= 2) {
			text = text.replaceAll('<duell-player-1>', this.players[0].name);
			text = text.replaceAll('<duell-player-2>', this.players[1].name);
		}
		return text;
	}

	get duellActivePlayer(): Player {
		return this.players[this.duellActivePlayerIndex % this.players.length];
	}

	get duellInactivePlayer(): Player {
		return this.players[(this.duellActivePlayerIndex + 1) % this.players.length];
	}

	get duellWinner(): Player | undefined {
		return this.duellWinnerIndex === null ? undefined : this.players[this.duellWinnerIndex];
	}

	get tournamentFinished(): boolean {
		return this.tournamentBuilderIndex >= this.players.length;
	}

	get tournamentBuilder(): Player {
		return this.players[this.tournamentBuilderIndex % this.players.length];
	}

	get tournamentBall() {
		return this.board.balls[this.tournamentBallIndex % this.board.balls.length];
	}

	get tournamentActivePlayer(): Player {
		return this.players[this.tournamentBallIndex % this.players.length];
	}

	addPlayer(player: Player): void {
		this.players.push(player);
	}

	get thisPhone() {
		return this.deviceIndex === null ? undefined : this.board.course.phones[this.deviceIndex - 1];
	}

	screenPosToBoardPos(pos: VectorLike): Vector2d {
		if (!this.thisPhone) return Vector2d.fromObject(pos) ?? new Vector2d();
		return this.thisPhone.screenPosToBoardPos(
			Vector2d.fromObject(pos) ?? new Vector2d(),
			this.referenceCanvasSize
		);
	}

	boardPosToScreenPos(pos: VectorLike): Vector2d {
		if (!this.thisPhone) return Vector2d.fromObject(pos) ?? new Vector2d();
		return this.thisPhone.boardPosToScreenPos(
			Vector2d.fromObject(pos) ?? new Vector2d(),
			this.referenceCanvasSize
		);
	}

	screenAngleToBoardAngle(angle: number): number {
		return this.thisPhone ? angle + this.thisPhone.angle : angle;
	}

	boardAngleToScreenAngle(angle: number): number {
		return this.thisPhone ? angle - this.thisPhone.angle : angle;
	}

	get scalingFactor(): number {
		return this.thisPhone?.scalar ?? 1;
	}

	get creditCardScalingFactor(): number {
		return this.thisPhone ? this.thisPhone.creditCardScalingFactor(this.referenceCanvasSize) : 1;
	}

	get combinedScalingFactor(): number {
		return this.creditCardScalingFactor * this.scalingFactor;
	}

	toObject(deviceIndex?: number): GameStateObject {
		return {
			phase: this.phase,
			mode: this.mode,
			board: this.board.toObject(),
			cameraControlsActive: this.cameraControlsActive,
			players: this.players.map((player) => player.toObject()),
			index: deviceIndex ?? this.deviceIndex,
			placingObjectType: this.placingObjectType,
			tournamentBuilderIndex: this.tournamentBuilderIndex,
			tournamentBallIndex: this.tournamentBallIndex,
			duellActivePlayerIndex: this.duellActivePlayerIndex,
			duellWinnerIndex: this.duellWinnerIndex,
			tournamentMaxKicks: this.tournamentMaxKicks
		};
	}

	updatePhysics(hostTime = Date.now()): void {
		this.board.updatePhysics(hostTime);
	}

	startSandboxRound(): void {
		this.board.balls = [];
		this.board.spawnBall({ spriteUrl: Sprite.BallWhite });
	}

	updateSandbox(): boolean {
		this.board.balls = this.board.balls.filter((ball) => ball.radius > 0);
		return false;
	}

	startTournamentRound(): void {
		this.board.balls = [];
		for (let i = 0; i < this.players.length; i++) {
			this.board.spawnBall({ spriteUrl: allBallSpriteList[i % allBallSpriteList.length] });
		}
		this.tournamentBallIndex = 0;
		for (const ball of this.board.balls) ball.active = false;
		this.tournamentBall.active = true;
	}

	endTournament(): void {
		this.phase = gamePhase.ShowingResultsOfTournament;
	}

	endTournamentRound(): void {
		if (this.board.balls.length === 0) return;
		this.phase = gamePhase.TournamentExplanation;

		// Players who didn't reach the hole in time get two penalty points.
		for (let i = 0; i < this.players.length; i++) {
			const roundIndex = this.tournamentBuilderIndex;
			if (!this.board.balls[i]?.inHole) {
				this.players[i].roundScores[roundIndex] += 2;
			}
		}

		this.tournamentBuilderIndex++;
		this.board.balls = [];
		if (this.tournamentFinished) this.endTournament();
		this.board.objects = [];
	}

	onTournamentKick(ball: { uid: string }): void {
		let ballIndex = 0;
		for (let i = 0; i < this.board.balls.length; i++) {
			ballIndex = i;
			if (ball.uid === this.board.balls[i].uid) break;
		}
		this.tournamentBall.active = false;
		this.tournamentBallIndex = ballIndex + 1;
		this.tournamentBall.active = true;
		this.advanceTournamentBall(true);
	}

	advanceTournamentBall(forceSpeak = false): boolean {
		if (!this.tournamentBall) return false;

		const previousPlayerName = this.tournamentActivePlayer.name;
		let inHoleCount = 0;
		while (
			(this.tournamentBall.inHole && this.tournamentBall.radius === 0) ||
			(this.tournamentBall.kicks >= this.tournamentMaxKicks && !this.tournamentBall.isInMovement())
		) {
			inHoleCount++;
			this.tournamentBall.active = false;
			this.tournamentBallIndex++;
			this.tournamentBall.active = true;
			if (inHoleCount >= this.players.length) return false;
		}

		if (
			(previousPlayerName !== this.tournamentActivePlayer.name || forceSpeak) &&
			isPlayingPhase(this.phase)
		) {
			// The legacy implementation announced the next player after a short
			// delay and only if the game was still running.
			const name = this.tournamentActivePlayer.name;
			setTimeout(() => {
				if (isPlayingPhase(this.phase)) this.board.effects.say(name);
			}, 1000);
		}
		return true;
	}

	updateTournament(): boolean {
		let madeChange = false;
		for (let i = 0; i < this.players.length; i++) {
			const kicks = this.board.balls[i]?.kicks;
			if (kicks === undefined) continue;
			const player = this.players[i];
			const roundIndex = this.tournamentBuilderIndex;
			if (player.roundScores[roundIndex] === undefined) {
				player.addRound(kicks);
				madeChange = true;
			} else {
				player.roundScores[roundIndex] = kicks;
			}
		}

		if (!this.advanceTournamentBall()) {
			this.endTournamentRound();
			madeChange = true;
		}
		return madeChange;
	}

	endDuell(): void {
		this.phase = gamePhase.ShowingResultsOfDuell;
		this.board.balls = [];
	}

	startDuellRound(): void {
		this.board.balls = [];
		this.board.spawnBall({ spriteUrl: Sprite.BallWhite });
	}

	updateDuell(): boolean {
		const ball = this.board.balls[0];
		if (ball && ball.radius === 0 && ball.inHole) {
			const closestObject = this.board.getClosestObject(ball.pos);
			this.duellWinnerIndex = closestObject?.type === golfObjectType.DuellHole1 ? 0 : 1;
			this.endDuell();
			return true;
		}
		return false;
	}

	update(hostTime = Date.now()): boolean | undefined {
		this.updatePhysics(hostTime);
		if (!isPlayingPhase(this.phase)) return false;
		if (this.mode === gameMode.Tournament) return this.updateTournament();
		if (this.mode === gameMode.Sandbox) return this.updateSandbox();
		if (this.mode === gameMode.Duell) return this.updateDuell();
		return false;
	}
}

// Kept as an array so the tournament uses the exact legacy colour order.
const allBallSpriteList = [
	Sprite.BallBlue,
	Sprite.BallRed,
	Sprite.BallYellow,
	Sprite.BallPink,
	Sprite.BallOrange,
	Sprite.BallCyan,
	Sprite.BallViolet,
	Sprite.BallLightblue,
	Sprite.BallWhite
];
