import { Vector2d } from '$lib/game/vector';

interface Landmark {
	x: number;
	y: number;
	z: number;
}

interface HandLandmarkerResult {
	landmarks: Landmark[][];
}

interface HandLandmarkerInstance {
	detectForVideo(video: HTMLVideoElement, timestamp: number): HandLandmarkerResult;
}

interface HandLandmarkerConstructor {
	createFromOptions(
		vision: unknown,
		options: {
			baseOptions: { modelAssetPath: string; delegate: string };
			runningMode: string;
			numHands: number;
		}
	): Promise<HandLandmarkerInstance>;
}

interface VisionModule {
	HandLandmarker: HandLandmarkerConstructor;
	FilesetResolver: {
		forVisionTasks(path: string): Promise<unknown>;
	};
}

type PositionListener = (screenPos: Vector2d, normalizedPos: Vector2d) => void;
type SimpleListener = () => void;

const MEDIAPIPE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';
const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm';
const HAND_MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * A small wrapper around MediaPipe's hand landmarker. It is loaded from a CDN
 * on demand so the normal game does not pay for the camera bundle.
 */
export class HandControls {
	videoElement: HTMLVideoElement | null = null;
	landmarker: HandLandmarkerInstance | null = null;
	cameraActive = false;
	cameraFailed = false;
	isLoading = false;
	isDragging = false;
	onError: (message: string) => void = () => {};

	dragPrepareCount = 0;
	dragEndCount = 0;
	notSeenCount = 0;

	readonly volatilityResistance: number;
	readonly minimumImageDelay: number;

	private stream: MediaStream | null = null;
	private frameRequest: number | null = null;
	private lastImageTime = 0;
	private onNonDragMoves: PositionListener[] = [];
	private onDragStarts: PositionListener[] = [];
	private onDragMoves: PositionListener[] = [];
	private onDragEnds: SimpleListener[] = [];
	private onDragCancels: SimpleListener[] = [];

	constructor({ minimumImageDelay = 0, volatilityResistance = 5 } = {}) {
		this.minimumImageDelay = minimumImageDelay;
		this.volatilityResistance = volatilityResistance;
	}

	get hasLoaded(): boolean {
		return this.landmarker !== null;
	}

	hasCamera(): boolean {
		return Boolean(navigator.mediaDevices?.getUserMedia);
	}

	onNonDragMove(listener: PositionListener): void {
		this.onNonDragMoves.push(listener);
	}

	onDragStart(listener: PositionListener): void {
		this.onDragStarts.push(listener);
	}

	onDragMove(listener: PositionListener): void {
		this.onDragMoves.push(listener);
	}

	onDragEnd(listener: SimpleListener): void {
		this.onDragEnds.push(listener);
	}

	onDragCancel(listener: SimpleListener): void {
		this.onDragCancels.push(listener);
	}

	async load(): Promise<void> {
		if (this.hasLoaded || this.isLoading) return;
		this.isLoading = true;
		try {
			const moduleUrl = MEDIAPIPE_MODULE_URL;
			const vision = (await import(/* @vite-ignore */ moduleUrl)) as unknown as VisionModule;
			const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
			this.landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
				baseOptions: {
					modelAssetPath: HAND_MODEL_URL,
					delegate: 'GPU'
				},
				runningMode: 'VIDEO',
				numHands: 1
			});
		} finally {
			this.isLoading = false;
		}
	}

	async startCamera(): Promise<void> {
		if (this.cameraActive) return;
		if (!this.hasCamera()) throw new Error('No camera found');
		this.cameraActive = true;
		try {
			if (!this.hasLoaded) await this.load();
			if (!this.cameraActive) return;

			this.createVideoElement();
			this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
			if (!this.cameraActive) {
				this.stopTracks();
				return;
			}
			this.videoElement!.srcObject = this.stream;
			this.videoElement!.addEventListener('loadeddata', () => void this.loop(), {
				once: true
			});
		} catch (error) {
			this.cameraActive = false;
			this.cameraFailed = true;
			this.stopTracks();
			throw error;
		}
	}

	stopCamera(): void {
		this.cameraActive = false;
		this.cameraFailed = false;
		if (this.frameRequest !== null) {
			window.cancelAnimationFrame(this.frameRequest);
			this.frameRequest = null;
		}
		this.stopTracks();
		this.videoElement?.remove();
		this.videoElement = null;
	}

	destroy(): void {
		this.stopCamera();
	}

	private createVideoElement(): void {
		this.videoElement?.remove();
		const video = document.createElement('video');
		video.autoplay = true;
		video.playsInline = true;
		video.muted = true;
		video.style.display = 'none';
		document.body.appendChild(video);
		this.videoElement = video;
	}

	private stopTracks(): void {
		for (const track of this.stream?.getTracks() ?? []) track.stop();
		this.stream = null;
	}

	private async loop(): Promise<void> {
		if (!this.cameraActive || !this.landmarker || !this.videoElement) return;

		try {
			const now = performance.now();
			const results = this.landmarker.detectForVideo(this.videoElement, now);
			if (results.landmarks.length > 0) {
				this.notSeenCount = 0;
				const landmarks = results.landmarks[0];
				const thumbTip = landmarks[4];
				const indexFingerTip = landmarks[8];
				const indexFingerBase = landmarks[5];
				const wrist = landmarks[0];
				const handSizeDist = this.calc3dDistance(wrist, indexFingerBase);
				const thumbIndexDist = this.calc3dDistance(thumbTip, indexFingerTip);
				const handIsClosed = thumbIndexDist < handSizeDist * 0.33;
				const cursorPos = this.getAverage3dPos(indexFingerTip, thumbTip);
				const normalized = new Vector2d(1 - cursorPos.x, cursorPos.y);
				const screenPos = normalized
					.scaleX(this.videoElement.videoWidth || window.innerWidth)
					.scaleY(this.videoElement.videoHeight || window.innerHeight);

				if (this.isDragging) {
					if (handIsClosed) {
						this.trigger(this.onDragMoves, screenPos, normalized);
						this.dragEndCount = 0;
					} else {
						this.dragEndCount++;
					}
					if (this.dragEndCount >= this.volatilityResistance) {
						this.isDragging = false;
						this.triggerSimple(this.onDragEnds);
					}
				} else {
					this.trigger(this.onNonDragMoves, screenPos, normalized);
					if (handIsClosed) this.dragPrepareCount++;
					else this.dragPrepareCount = 0;

					if (this.dragPrepareCount >= this.volatilityResistance) {
						this.isDragging = true;
						this.trigger(this.onDragStarts, screenPos, normalized);
					}
				}
			} else {
				this.notSeenCount++;
				this.dragPrepareCount = 0;
				if (this.isDragging && this.notSeenCount >= this.volatilityResistance) {
					this.isDragging = false;
					this.triggerSimple(this.onDragCancels);
				}
			}
		} catch {
			/* A skipped frame is normal while the video warms up. */
		}

		const waitTime = this.minimumImageDelay - (Date.now() - this.lastImageTime);
		if (waitTime > 0) await new Promise((resolve) => setTimeout(resolve, waitTime));
		this.lastImageTime = Date.now();
		if (this.cameraActive) {
			this.frameRequest = window.requestAnimationFrame(() => void this.loop());
		}
	}

	private calc3dDistance(p1: Landmark, p2: Landmark): number {
		return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
	}

	private getAverage3dPos(p1: Landmark, p2: Landmark): Landmark {
		return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: (p1.z + p2.z) / 2 };
	}

	private trigger(listeners: PositionListener[], screenPos: Vector2d, normalized: Vector2d): void {
		for (const listener of listeners) listener(screenPos, normalized);
	}

	private triggerSimple(listeners: SimpleListener[]): void {
		for (const listener of listeners) listener();
	}
}
