import { Sprite } from './sprites';

/** Shared image cache for every canvas in the app. */
export class SpriteCache {
	private static images = new Map<string, HTMLImageElement>();
	private static pending = new Map<string, Promise<HTMLImageElement>>();

	static has(src: string): boolean {
		return this.images.has(src);
	}

	static get(src: string): HTMLImageElement | undefined {
		return this.images.get(src);
	}

	static loadImage(src: string): Promise<HTMLImageElement> {
		const existing = this.images.get(src);
		if (existing) return Promise.resolve(existing);

		const pending = this.pending.get(src);
		if (pending) return pending;

		const promise = new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.onload = () => {
				this.images.set(src, image);
				this.pending.delete(src);
				resolve(image);
			};
			image.onerror = () => {
				this.pending.delete(src);
				reject(new Error(`Could not load sprite: ${src}`));
			};
			image.src = src;
		});
		this.pending.set(src, promise);
		return promise;
	}

	static async load(urls: Iterable<string> = Object.values(Sprite)): Promise<void> {
		await Promise.all(
			Array.from(new Set(urls)).map(async (url) => {
				if (this.images.has(url)) return;
				try {
					await this.loadImage(url);
				} catch {
					// A missing decorative sprite should not make the app unusable.
					console.warn(`Sprite not found: ${url}`);
				}
			})
		);
	}

	/** Access an image and lazily load it when needed. */
	static image(src: string): HTMLImageElement | undefined {
		const image = this.images.get(src);
		if (!image && typeof window !== 'undefined') {
			void this.loadImage(src).catch(() => {});
		}
		return image;
	}
}
