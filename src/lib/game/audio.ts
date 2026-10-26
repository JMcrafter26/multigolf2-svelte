import { AudioSprite, allNoteSprites, type AudioPath } from './sprites';
import type { GameEffects } from './effects';
import { i18n } from '../i18n/state.svelte';

type SoundOptions = { volume?: number };

/**
 * DOM-based audio engine. The game core only knows the small `GameEffects`
 * interface, which keeps physics unit-testable.
 */
export class AudioEngine implements GameEffects {
	soundsEnabled = true;
	speechEnabled = true;
	hasLoaded = false;

	private audioElements = new Map<string, HTMLAudioElement[]>();
	private audioIndices = new Map<string, number>();
	private loading: Promise<void> | null = null;

	async load(): Promise<void> {
		if (this.hasLoaded) return;
		if (this.loading) return this.loading;

		this.loading = (async () => {
			for (const source of Object.values(AudioSprite)) {
				this.audioElements.set(source, []);
				this.audioIndices.set(source, 0);
			}

			const promises: Promise<void>[] = [];
			for (let i = 0; i < 5; i++) {
				for (const source of Object.values(AudioSprite)) {
					promises.push(this.loadAudio(source));
				}
			}
			await Promise.allSettled(promises);
			this.hasLoaded = true;
		})();

		return this.loading;
	}

	private loadAudio(source: string): Promise<void> {
		return new Promise((resolve) => {
			if (typeof document === 'undefined') {
				resolve();
				return;
			}
			const element = document.createElement('audio');
			element.style.display = 'none';
			element.preload = 'auto';
			document.body.appendChild(element);

			const finish = () => resolve();
			element.addEventListener('canplaythrough', finish, { once: true });
			element.addEventListener('error', finish, { once: true });

			element.src = source;
			element.load();
			this.audioElements.get(source)?.push(element);

			// iOS sometimes never fires canplaythrough.
			setTimeout(finish, 500);
		});
	}

	play(sprite: string, { volume = 1 }: SoundOptions = {}): void {
		if (!this.soundsEnabled || !this.hasLoaded) return;
		const elements = this.audioElements.get(sprite);
		if (!elements?.length) return;

		const index = (this.audioIndices.get(sprite) ?? 0) % elements.length;
		this.audioIndices.set(sprite, index + 1);
		const audio = elements[index];
		if (!audio) return;

		audio.volume = Math.max(0, Math.min(1, volume));
		audio.currentTime = 0;
		void audio.play().catch(() => {});
	}

	playSound(sprite: AudioPath, options?: SoundOptions): void {
		this.play(sprite, options);
	}

	randomNote(options?: SoundOptions): void {
		const index = Math.floor(Math.random() * allNoteSprites.length);
		this.play(allNoteSprites[index], options);
	}

	say(text: string, options: { rate?: number; lang?: string } = {}): void {
		if (!this.speechEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
			return;
		}
		const locale = i18n.locale;
		const message = new SpeechSynthesisUtterance(text);
		message.rate = options.rate ?? 1;
		message.lang = options.lang ?? (locale === 'de' ? 'de-DE' : 'en-US');
		message.volume = 1;
		window.speechSynthesis.speak(message);
	}

	plop(): void {
		this.playSound(AudioSprite.Plop);
	}
}

export const audioEngine = new AudioEngine();
