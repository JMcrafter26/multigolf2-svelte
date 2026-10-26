const COMPLETED_KEY = 'monogolf-completed-levels';
const HIGHCORE_PREFIX = 'mono-highscore-';

export function getUnlockedLevels(): Set<string> {
	try {
		const stored = localStorage.getItem(COMPLETED_KEY);
		if (!stored) return new Set();
		return new Set(
			stored
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		);
	} catch {
		return new Set();
	}
}

export function hasUnlockedLevel(packId: string, levelId: string | number): boolean {
	const numericId = Number(levelId);
	if (Number.isFinite(numericId) && numericId <= 1) return true;
	return getUnlockedLevels().has(`${packId}:${levelId}`);
}

export function unlockLevel(packId: string, levelId: string | number): void {
	try {
		const unlocked = getUnlockedLevels();
		unlocked.add(`${packId}:${levelId}`);
		localStorage.setItem(COMPLETED_KEY, Array.from(unlocked).join(','));
	} catch {
		/* storage may be unavailable in private mode */
	}
}

export function resetUnlockedLevels(): void {
	try {
		localStorage.removeItem(COMPLETED_KEY);
	} catch {
		/* ignore */
	}
}

export function getPackHighscore(packId: string): number | null {
	try {
		const raw = localStorage.getItem(HIGHCORE_PREFIX + packId);
		if (raw === null) return null;
		const value = Number.parseInt(raw);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

export function setPackHighscore(packId: string, score: number): void {
	try {
		const previous = getPackHighscore(packId);
		if (previous !== null && previous >= score) return;
		localStorage.setItem(HIGHCORE_PREFIX + packId, String(score));
	} catch {
		/* ignore */
	}
}

// Challenge progress is scoped per pack so switching packs cannot accidentally
// resume another pack's run (the legacy site used two global keys).
export function getChallengeProgress(packId: string): { kicks: number; level: number } | null {
	try {
		const kicks = Number.parseInt(localStorage.getItem(`mono-challenge-kicks-${packId}`) ?? '');
		const level = Number.parseInt(localStorage.getItem(`mono-challenge-level-${packId}`) ?? '');
		if (!Number.isFinite(kicks) || !Number.isFinite(level) || kicks < 1) return null;
		return { kicks, level };
	} catch {
		return null;
	}
}

export function setChallengeProgress(packId: string, kicks: number, level: number): void {
	try {
		localStorage.setItem(`mono-challenge-kicks-${packId}`, String(kicks));
		localStorage.setItem(`mono-challenge-level-${packId}`, String(level));
	} catch {
		/* ignore */
	}
}

export function clearChallengeProgress(packId: string): void {
	try {
		localStorage.removeItem(`mono-challenge-kicks-${packId}`);
		localStorage.removeItem(`mono-challenge-level-${packId}`);
	} catch {
		/* ignore */
	}
}
