import type { GameStateObject } from '$lib/game/gamestate';

export interface LocalizedText {
	en: string;
	de: string;
}

export interface LevelStyling {
	grid?: string;
	ball?: string;
	colors?: {
		customWallInner?: string;
		customWallOuter?: string;
		pullColor?: string;
	};
}

export interface LevelPackConfig {
	id: string;
	name: LocalizedText;
	description: LocalizedText;
	author: string;
	difficulty: 'easy' | 'medium' | 'hard';
	'difficulty-name': LocalizedText;
	styling?: LevelStyling;
	num_levels: number;
}

export interface LevelDefinition {
	id: number;
	difficulty?: string;
	par?: number;
	gameState: GameStateObject;
}

export interface LevelPack {
	config: LevelPackConfig;
	levels: LevelDefinition[];
}

export type LevelPackSummary = LevelPackConfig;

const PACK_ID_PATTERN = /^[a-z0-9_-]+$/i;

export function assetUrl(path: string): string {
	if (!path) return path;
	if (/^(?:https?:)?\/\//.test(path) || path.startsWith('/')) return path;
	return `/${path.replace(/^\.?\//, '')}`;
}

export async function fetchLevelPacks(): Promise<LevelPackSummary[]> {
	const response = await fetch('/mono/level-data/all-packs.json');
	if (!response.ok) throw new Error(`Failed to load level packs (${response.status})`);
	return (await response.json()) as LevelPackSummary[];
}

export async function fetchLevelPack(packId: string): Promise<LevelPack> {
	if (!PACK_ID_PATTERN.test(packId)) throw new Error('Invalid pack id');
	const response = await fetch(`/mono/level-data/packs/${packId}.json`);
	if (!response.ok) throw new Error(`Failed to load level pack (${response.status})`);
	const pack = (await response.json()) as LevelPack;
	if (!pack.config || !Array.isArray(pack.levels)) throw new Error('Invalid level pack');
	return pack;
}

export function getLevelText(text: LocalizedText | undefined, locale: 'en' | 'de'): string {
	if (!text) return '';
	return text[locale] || text.en;
}
