import type { AudioPath } from './sprites';

/**
 * Side effects are injected so the game simulation stays independent from the
 * DOM and can be unit tested in Node.
 */
export interface GameEffects {
	playSound(sprite: AudioPath, options?: { volume?: number }): void;
	randomNote(options?: { volume?: number }): void;
	say(text: string, options?: { rate?: number; lang?: string }): void;
}

export const silentEffects: GameEffects = {
	playSound: () => {},
	randomNote: () => {},
	say: () => {}
};
