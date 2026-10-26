/**
 * Keeps the screen awake while a client device is part of the course.
 *
 * Uses the Screen Wake Lock API where available. Older browsers fall back to
 * the muted, looping video trick popularised by NoSleep.js (MIT, Rich Tibbett).
 * The two tiny media files live in `static/assets`.
 */
export class NoSleep {
	private wakeLock: WakeLockSentinel | null = null;
	private video: HTMLVideoElement | null = null;
	private enabled = false;
	private destroyed = false;

	constructor() {
		if (!('wakeLock' in navigator)) return;
		document.addEventListener('visibilitychange', this.onVisibilityChange);
		document.addEventListener('fullscreenchange', this.onVisibilityChange);
	}

	get isEnabled(): boolean {
		return this.enabled;
	}

	enable(): Promise<void> {
		if (this.destroyed) return Promise.resolve();
		this.enabled = true;

		if ('wakeLock' in navigator) {
			if (this.wakeLock) return Promise.resolve();
			return navigator.wakeLock
				.request('screen')
				.then((lock) => {
					this.wakeLock = lock;
					lock.addEventListener('release', () => {
						if (this.wakeLock === lock) this.wakeLock = null;
					});
				})
				.catch(() => {
					this.enabled = false;
				});
		}

		return this.playFallbackVideo();
	}

	disable(): void {
		this.enabled = false;
		void this.wakeLock?.release().catch(() => {});
		this.wakeLock = null;
		this.video?.pause();
	}

	destroy(): void {
		this.destroyed = true;
		document.removeEventListener('visibilitychange', this.onVisibilityChange);
		document.removeEventListener('fullscreenchange', this.onVisibilityChange);
		this.disable();
		this.video?.remove();
		this.video = null;
	}

	private onVisibilityChange = (): void => {
		if (this.enabled && document.visibilityState === 'visible') void this.enable();
	};

	private playFallbackVideo(): Promise<void> {
		if (!this.video) {
			const video = document.createElement('video');
			video.title = 'No Sleep';
			video.setAttribute('playsinline', '');
			video.muted = true;
			video.style.display = 'none';

			for (const [type, file] of [
				['video/webm', '/assets/no-sleep.webm'],
				['video/mp4', '/assets/no-sleep.mp4']
			]) {
				const source = document.createElement('source');
				source.src = file;
				source.type = type;
				video.appendChild(source);
			}

			video.addEventListener('loadedmetadata', () => {
				if (video.duration <= 1) {
					video.loop = true;
				} else {
					video.addEventListener('timeupdate', () => {
						if (video.currentTime > 0.5) video.currentTime = Math.random();
					});
				}
			});

			document.body.appendChild(video);
			this.video = video;
		}

		return this.video.play().catch(() => {
			this.enabled = false;
		});
	}
}
