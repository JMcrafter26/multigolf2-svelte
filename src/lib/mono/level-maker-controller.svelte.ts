import { Board } from '$lib/game/board';
import { gameMode, gamePhase, GameState, type GameStateObject } from '$lib/game/gamestate';
import { createTouchInfo } from '$lib/game/input';
import {
	defaultObjects,
	golfObjectType,
	GolfObject,
	placableObjects,
	type GolfObjectType
} from '$lib/game/objects';
import { Course, PhoneCoordinates } from '$lib/game/phone-coordinates';
import { Renderer } from '$lib/game/renderer';
import { Vector2d } from '$lib/game/vector';
import { t } from '$lib/i18n/state.svelte';
import type { MessageKey } from '$lib/i18n/messages';

const LEVEL_SIZE = new Vector2d(360, 640);
const STORAGE_KEY = 'level-maker-temp';

function makeDefaultState(): GameState {
	const course = new Course([PhoneCoordinates.fromWidthHeight(LEVEL_SIZE.x, LEVEL_SIZE.y)]);
	const board = new Board(course, [
		GolfObject.makeDefault(golfObjectType.Start).setPos(
			new Vector2d(LEVEL_SIZE.x / 2, (LEVEL_SIZE.y * 3) / 4)
		),
		GolfObject.makeDefault(golfObjectType.Hole).setPos(
			new Vector2d(LEVEL_SIZE.x / 2, LEVEL_SIZE.y / 4)
		)
	]);
	const state = new GameState(gamePhase.PlayingSandbox, gameMode.Sandbox, board, false, [], 1);
	state.phase = gamePhase.Placing;
	state.deviceIndex = 1;
	return state;
}

function snapToGrid(value: number): number {
	return Math.floor(value / 20) * 20 + Math.round((value % 20) / 20) * 20;
}

export class LevelMakerController {
	revision = $state(0);
	ready = $state(false);
	status = $state('');
	error = $state('');
	fileName = $state('level');
	objectType = $state<GolfObjectType>(golfObjectType.Lava);
	selectedUid = $state<string | null>(null);

	gameState: GameState = makeDefaultState();
	canvas: HTMLCanvasElement | null = null;
	context: CanvasRenderingContext2D | null = null;

	private touchInfo = createTouchInfo();
	private draggingObject: GolfObject | null = null;
	private draggingOffset = new Vector2d();
	private frameRequest: number | null = null;
	private autoSaveTimer: number | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private initialized = false;
	private destroyed = false;

	get objectTypes(): GolfObjectType[] {
		return placableObjects
			.filter(
				(object) => object.type !== golfObjectType.Eraser && object.visibility(this.gameState)
			)
			.map((object) => object.type);
	}

	get objectsTopFirst(): GolfObject[] {
		void this.revision;
		return [...this.gameState.board.objects].reverse();
	}

	get selectedObject(): GolfObject | null {
		void this.revision;
		if (!this.selectedUid) return null;
		return this.gameState.board.objects.find((object) => object.uid === this.selectedUid) ?? null;
	}

	get savedLocally(): string {
		return t('maker.savedLocally');
	}

	attachCanvas(canvas: HTMLCanvasElement): void {
		if (this.canvas === canvas) return;
		this.detachCanvas();
		this.canvas = canvas;
		this.context = canvas.getContext('2d');
		canvas.addEventListener('pointerdown', this.onPointerDown);
		canvas.addEventListener('pointermove', this.onPointerMove);
		canvas.addEventListener('pointerup', this.onPointerUp);
		canvas.addEventListener('pointercancel', this.onPointerUp);
		this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
		this.resizeObserver.observe(canvas);
		if (this.ready) this.scheduleRender();
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		this.initialized = true;
		try {
			await Renderer.load();
			if (this.destroyed) return;
			this.loadFromLocalStorage();
			this.ready = true;
			this.bump();
			this.scheduleRender();
			this.autoSaveTimer = window.setInterval(() => this.saveToLocalStorage(), 1000);
			window.addEventListener('keydown', this.onKeyDown);
		} catch (error) {
			this.error = String(error);
			this.bump();
		}
	}

	destroy(): void {
		this.destroyed = true;
		this.detachCanvas();
		if (this.frameRequest !== null) window.cancelAnimationFrame(this.frameRequest);
		if (this.autoSaveTimer !== null) window.clearInterval(this.autoSaveTimer);
		this.resizeObserver?.disconnect();
		window.removeEventListener('keydown', this.onKeyDown);
	}

	nameForType(type: GolfObjectType): string {
		const object = defaultObjects[type];
		return t(object.nameKey as MessageKey);
	}

	selectObject(uid: string | null): void {
		this.selectedUid = uid;
		this.touchInfo.focusedObject = uid
			? (this.gameState.board.objects.find((object) => object.uid === uid) ?? null)
			: null;
		this.bump();
		this.scheduleRender();
	}

	addObject(): void {
		const startExists = this.gameState.board.objects.some(
			(object) => object.type === golfObjectType.Start
		);
		if (this.objectType === golfObjectType.Start && startExists) {
			this.status = t('maker.startExists');
			this.bump();
			return;
		}
		const template = placableObjects.find((object) => object.type === this.objectType);
		if (!template) return;
		const object = template.copy();
		object.uid = GolfObject.makeRandomUid();
		object.pos = new Vector2d(LEVEL_SIZE.x / 2, LEVEL_SIZE.y / 2);
		this.gameState.board.objects.push(object);
		this.status = '';
		this.selectObject(object.uid);
		this.saveToLocalStorage();
	}

	deleteSelected(): void {
		const selected = this.selectedObject;
		if (!selected) return;
		this.gameState.board.objects = this.gameState.board.objects.filter(
			(object) => object.uid !== selected.uid
		);
		this.selectedUid = null;
		this.touchInfo.focusedObject = null;
		this.bump();
		this.scheduleRender();
		this.saveToLocalStorage();
	}

	duplicateSelected(): void {
		const selected = this.selectedObject;
		if (!selected || selected.type === golfObjectType.Start) return;
		const copy = selected.copy();
		copy.uid = GolfObject.makeRandomUid();
		copy.pos.iadd(new Vector2d(20, 20));
		this.gameState.board.objects.push(copy);
		this.status = '';
		this.selectObject(copy.uid);
		this.saveToLocalStorage();
	}

	bringToFront(): void {
		const selected = this.selectedObject;
		if (!selected) return;
		this.gameState.board.objects = [
			...this.gameState.board.objects.filter((object) => object.uid !== selected.uid),
			selected
		];
		this.bump();
		this.scheduleRender();
		this.saveToLocalStorage();
	}

	sendToBack(): void {
		const selected = this.selectedObject;
		if (!selected) return;
		this.gameState.board.objects = [
			selected,
			...this.gameState.board.objects.filter((object) => object.uid !== selected.uid)
		];
		this.bump();
		this.scheduleRender();
		this.saveToLocalStorage();
	}

	setPosition(axis: 'x' | 'y', value: number): void {
		const selected = this.selectedObject;
		if (!selected || !Number.isFinite(value)) return;
		selected.pos[axis] = value;
		this.changed();
	}

	setSize(axis: 'x' | 'y', value: number): void {
		const selected = this.selectedObject;
		if (!selected || !selected.resizable || !Number.isFinite(value)) return;
		selected.size[axis] = Math.max(4, value);
		this.changed();
	}

	setAngleDegrees(value: number): void {
		const selected = this.selectedObject;
		if (!selected || !Number.isFinite(value)) return;
		selected.angle = (value / 180) * Math.PI;
		this.changed();
	}

	exportLevel(): void {
		const name = this.fileName.trim();
		if (!name) {
			this.status = t('maker.nameRequired');
			this.bump();
			return;
		}
		const safeName = name.replace(/[\\/:*?"<>|]+/g, '-');
		const content = JSON.stringify(this.gameState.toObject());
		const blob = new Blob([content], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = safeName.endsWith('.muglf') ? safeName : `${safeName}.muglf`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
		this.status = t('maker.exported');
		this.bump();
	}

	async importFile(file: File | undefined): Promise<void> {
		if (!file) return;
		this.error = '';
		try {
			const content = await file.text();
			const parsed = JSON.parse(content) as GameStateObject;
			const state = GameState.fromObject(parsed);
			if (state.board.course.phones.length === 0) {
				throw new Error('Level has no course');
			}
			state.phase = gamePhase.Placing;
			state.mode = gameMode.Sandbox;
			state.deviceIndex = 1;
			this.gameState = state;
			this.fileName = file.name.replace(/\.muglf$/i, '');
			this.selectedUid = null;
			this.touchInfo.focusedObject = null;
			this.status = t('maker.imported');
			this.bump();
			this.scheduleRender();
			this.saveToLocalStorage();
		} catch (error) {
			this.status = '';
			this.error = t('maker.importError');
			console.error(error);
			this.bump();
		}
	}

	testLevel(): void {
		this.saveToLocalStorage();
		window.open('/level/?id=editor&pack=none', '_blank')?.focus();
	}

	resetLevel(): void {
		if (!confirm(t('maker.resetConfirm'))) return;
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			/* ignore */
		}
		this.gameState = makeDefaultState();
		this.selectedUid = null;
		this.touchInfo.focusedObject = null;
		this.fileName = 'level';
		this.status = '';
		this.error = '';
		this.bump();
		this.scheduleRender();
		this.saveToLocalStorage();
	}

	saveToLocalStorage(): void {
		if (!this.gameState) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gameState.toObject()));
		} catch {
			/* storage may be unavailable */
		}
	}

	private loadFromLocalStorage(): void {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as GameStateObject;
			const state = GameState.fromObject(parsed);
			if (state.board.course.phones.length === 0) return;
			state.phase = gamePhase.Placing;
			state.mode = gameMode.Sandbox;
			state.deviceIndex = 1;
			this.gameState = state;
		} catch {
			this.gameState = makeDefaultState();
		}
	}

	private changed(): void {
		this.bump();
		this.scheduleRender();
		this.saveToLocalStorage();
	}

	private scheduleRender(): void {
		if (this.frameRequest !== null || !this.canvas || !this.context) return;
		this.frameRequest = window.requestAnimationFrame(() => {
			this.frameRequest = null;
			this.render();
		});
	}

	private render(): void {
		const canvas = this.canvas;
		const context = this.context;
		if (!canvas || !context) return;
		try {
			Renderer.updateCanvasSize(context);
			this.gameState.referenceCanvasSize.set(canvas.width, canvas.height);
			this.touchInfo.focusedObject = this.selectedObject;
			Renderer.render(this.gameState, context, this.touchInfo, {
				preventScrolling: false
			});
		} catch (error) {
			console.error(error);
		}
	}

	private pointerPosition(event: PointerEvent): Vector2d {
		const canvas = this.canvas;
		if (!canvas) return new Vector2d();
		const rect = canvas.getBoundingClientRect();
		return new Vector2d(
			((event.clientX - rect.left) / Math.max(rect.width, 1)) * canvas.width,
			((event.clientY - rect.top) / Math.max(rect.height, 1)) * canvas.height
		);
	}

	private onPointerDown = (event: PointerEvent): void => {
		if (!this.canvas) return;
		try {
			this.canvas.setPointerCapture(event.pointerId);
		} catch {
			/* not critical */
		}
		const screenPos = this.pointerPosition(event);
		const boardPos = this.gameState.screenPosToBoardPos(screenPos);
		const hitObject = this.gameState.board.intersectObject(boardPos);
		if (hitObject) {
			this.draggingObject = hitObject;
			this.draggingOffset = hitObject.pos.sub(boardPos);
			this.selectObject(hitObject.uid);
		} else {
			this.draggingObject = null;
			this.selectObject(null);
		}
	};

	private onPointerMove = (event: PointerEvent): void => {
		if (!this.draggingObject) return;
		const screenPos = this.pointerPosition(event);
		const boardPos = this.gameState.screenPosToBoardPos(screenPos).add(this.draggingOffset);
		this.draggingObject.pos.setVector2d(boardPos);
		this.clampObjectPos(this.draggingObject);
		this.changed();
		event.preventDefault();
	};

	private onPointerUp = (): void => {
		this.draggingObject = null;
		this.draggingOffset.set(0, 0);
	};

	private clampObjectPos(object: GolfObject): void {
		const corner = object.corners[0];
		const newCorner = new Vector2d(snapToGrid(corner.x), snapToGrid(corner.y));
		object.pos.iadd(newCorner.sub(corner));
	}

	private onKeyDown = (event: KeyboardEvent): void => {
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			(target.matches('input, textarea, select') || target.isContentEditable)
		) {
			return;
		}
		const selected = this.selectedObject;
		if (!selected) return;

		const handled = (callback: () => void): void => {
			event.preventDefault();
			callback();
			this.changed();
		};

		if (event.key === 'd') {
			handled(() => this.duplicateSelected());
		} else if (event.key === 'f') {
			handled(() => this.bringToFront());
		} else if (event.key === 'b') {
			handled(() => this.sendToBack());
		} else if (event.key === 'Backspace' || event.key === 'Delete') {
			handled(() => this.deleteSelected());
		} else if (event.key === 'Tab') {
			handled(() => this.cycleSelection(event.shiftKey ? -1 : 1));
		} else if (event.key.startsWith('Arrow')) {
			handled(() => {
				const direction = new Vector2d(
					event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0,
					event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0
				);
				if (event.ctrlKey || event.metaKey) {
					selected.angle +=
						event.key === 'ArrowLeft' ? -Math.PI / 4 : event.key === 'ArrowRight' ? Math.PI / 4 : 0;
				} else if (event.shiftKey && selected.resizable) {
					const change = new Vector2d(
						event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0,
						event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0
					);
					selected.size.iadd(change);
					selected.size.set(Math.max(4, selected.size.x), Math.max(4, selected.size.y));
					selected.pos.iadd(direction.scale(0.5));
				} else {
					selected.pos.iadd(direction);
					this.clampObjectPos(selected);
				}
			});
		}
	};

	private cycleSelection(direction: number): void {
		const objects = this.gameState.board.objects;
		if (objects.length === 0) return;
		const current = objects.findIndex((object) => object.uid === this.selectedUid);
		const next = (((current + direction) % objects.length) + objects.length) % objects.length;
		this.selectObject(objects[next].uid);
	}

	private detachCanvas(): void {
		if (!this.canvas) return;
		this.canvas.removeEventListener('pointerdown', this.onPointerDown);
		this.canvas.removeEventListener('pointermove', this.onPointerMove);
		this.canvas.removeEventListener('pointerup', this.onPointerUp);
		this.canvas.removeEventListener('pointercancel', this.onPointerUp);
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.canvas = null;
		this.context = null;
	}

	private bump(): void {
		this.revision++;
	}
}
