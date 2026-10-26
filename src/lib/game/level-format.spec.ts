import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameState, type GameStateObject } from './gamestate';
import { golfObjectType } from './objects';

const packRoot = join(process.cwd(), 'static', 'assets', 'level-packs');
const runtimePackRoot = join(process.cwd(), 'static', 'mono', 'level-data', 'packs');

function findLevelFiles(): string[] {
	if (!existsSync(packRoot)) return [];
	const files: string[] = [];
	for (const pack of readdirSync(packRoot)) {
		const packDir = join(packRoot, pack);
		if (!statSync(packDir).isDirectory()) continue;
		for (const file of readdirSync(packDir)) {
			if (file.endsWith('.muglf')) files.push(join(packDir, file));
		}
	}
	return files;
}

interface RuntimeLevel {
	id: number | string;
	gameState: GameStateObject;
}

function findRuntimeLevels(): Array<{ label: string; level: RuntimeLevel }> {
	if (!existsSync(runtimePackRoot)) return [];
	const levels: Array<{ label: string; level: RuntimeLevel }> = [];
	for (const file of readdirSync(runtimePackRoot)) {
		if (!file.endsWith('.json')) continue;
		const pack = JSON.parse(readFileSync(join(runtimePackRoot, file), 'utf8')) as {
			levels?: RuntimeLevel[];
		};
		for (const level of pack.levels ?? []) {
			levels.push({ label: `${file} id ${level.id}`, level });
		}
	}
	return levels;
}

function checkLevel(gameState: GameStateObject): void {
	const state = GameState.fromObject(gameState);

	expect(state.board.course.phones.length).toBeGreaterThan(0);
	expect(state.board.objects.some((o) => o.type === golfObjectType.Start)).toBe(true);
	expect(state.board.objects.map((o) => o.type)).toContain(golfObjectType.Hole);

	// The compact wire format must survive a load/save cycle unchanged.
	const restored = GameState.fromObject(state.toObject());
	expect(restored.toObject()).toEqual(state.toObject());

	const ball = restored.board.spawnBall({ spriteUrl: 'ball-white' });
	expect(ball.pos.distance(restored.board.startPos ?? ball.pos)).toBe(0);
}

describe('legacy .muglf compatibility', () => {
	const files = findLevelFiles();

	it('finds the legacy level files', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	for (const file of files) {
		const label = file.slice(packRoot.length + 1);
		it(`loads and round-trips ${label}`, () => {
			const object = JSON.parse(readFileSync(file, 'utf8')) as GameStateObject;
			checkLevel(object);
		});
	}
});

describe('runtime level packs', () => {
	const levels = findRuntimeLevels();

	it('finds the runtime levels', () => {
		expect(levels.length).toBeGreaterThan(0);
	});

	for (const { label, level } of levels) {
		it(`loads and round-trips ${label}`, () => {
			checkLevel(level.gameState);
		});
	}
});
