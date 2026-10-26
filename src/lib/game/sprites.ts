/** Paths are public URLs served from `static/assets`. */
export const ASSET_ROOT = '/assets';

export const Sprite = {
	BallBlue: `${ASSET_ROOT}/compressed/objects/balls/blue.png`,
	BallCyan: `${ASSET_ROOT}/compressed/objects/balls/cyan.png`,
	BallLightblue: `${ASSET_ROOT}/compressed/objects/balls/light_blue.png`,
	BallOrange: `${ASSET_ROOT}/compressed/objects/balls/orange.png`,
	BallPink: `${ASSET_ROOT}/compressed/objects/balls/pink.png`,
	BallRed: `${ASSET_ROOT}/compressed/objects/balls/red.png`,
	BallViolet: `${ASSET_ROOT}/compressed/objects/balls/violet.png`,
	BallWhite: `${ASSET_ROOT}/compressed/objects/balls/white.png`,
	BallYellow: `${ASSET_ROOT}/compressed/objects/balls/yellow.png`,
	BallRainbow: `${ASSET_ROOT}/compressed/objects/balls/rainbow.png`,
	Grid: `${ASSET_ROOT}/compressed/objects/grid.png`,
	GridBlue: `${ASSET_ROOT}/compressed/objects/blue-grid.png`,
	GridCrazy: `${ASSET_ROOT}/compressed/objects/crazy-grid.png`,
	GridDark: `${ASSET_ROOT}/compressed/objects/dark-grid.png`,
	Hole: `${ASSET_ROOT}/compressed/objects/hole.png`,
	Start: `${ASSET_ROOT}/compressed/objects/start.png`,
	DuellHole1: `${ASSET_ROOT}/compressed/objects/duellHole1.png`,
	DuellHole2: `${ASSET_ROOT}/compressed/objects/duellHole2.png`,
	Lava: `${ASSET_ROOT}/compressed/objects/lava.png`,
	Cannon: `${ASSET_ROOT}/compressed/objects/cannon.png`,
	GravityBox: `${ASSET_ROOT}/compressed/objects/gravity-box.png`,
	Eraser: `${ASSET_ROOT}/objects/eraser.svg`,
	ZoomIcon: `${ASSET_ROOT}/zoom-icon.svg`,
	CustomWall: `${ASSET_ROOT}/objects/wall.svg`,
	CreditCard: `${ASSET_ROOT}/objects/credit-card.svg`,
	Logo: `${ASSET_ROOT}/logo/logo.svg`
} as const;

export type SpritePath = (typeof Sprite)[keyof typeof Sprite];

export const AudioSprite = {
	Plop: `${ASSET_ROOT}/audio/plop.mp3`,
	WinSound: `${ASSET_ROOT}/audio/win_sound.mp3`,
	Lava: `${ASSET_ROOT}/audio/lava.mp3`,
	Bonk: `${ASSET_ROOT}/audio/bonk.mp3`,
	Shot: `${ASSET_ROOT}/audio/shot.mp3`,
	Cannon: `${ASSET_ROOT}/audio/cannon.mp3`,
	Note1: `${ASSET_ROOT}/audio/notes/1.mp3`,
	Note2: `${ASSET_ROOT}/audio/notes/2.mp3`,
	Note3: `${ASSET_ROOT}/audio/notes/3.mp3`,
	Note4: `${ASSET_ROOT}/audio/notes/4.mp3`,
	Note5: `${ASSET_ROOT}/audio/notes/5.mp3`,
	Note6: `${ASSET_ROOT}/audio/notes/6.mp3`,
	Note7: `${ASSET_ROOT}/audio/notes/7.mp3`,
	Note8: `${ASSET_ROOT}/audio/notes/8.mp3`,
	Note9: `${ASSET_ROOT}/audio/notes/9.mp3`
} as const;

export type AudioPath = (typeof AudioSprite)[keyof typeof AudioSprite];

export const allNoteSprites = [
	AudioSprite.Note1,
	AudioSprite.Note2,
	AudioSprite.Note3,
	AudioSprite.Note4,
	AudioSprite.Note5,
	AudioSprite.Note6,
	AudioSprite.Note7,
	AudioSprite.Note8,
	AudioSprite.Note9
] as const;

export const AllBallSprites = [
	Sprite.BallBlue,
	Sprite.BallRed,
	Sprite.BallYellow,
	Sprite.BallPink,
	Sprite.BallOrange,
	Sprite.BallCyan,
	Sprite.BallViolet,
	Sprite.BallLightblue,
	Sprite.BallWhite
] as const;

/** Resolve paths stored in `.muglf`/pack JSON for use in the new app. */
export function normalizeAssetPath(path: string): string {
	if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
	const clean = path
		.replace(/^\.\.\//, '')
		.replace(/^\.\//, '')
		.replace(/^\//, '');
	if (clean.startsWith('assets/')) return `/${clean}`;
	if (clean.startsWith('compressed/') || clean.startsWith('audio/') || clean.startsWith('logo/')) {
		return `${ASSET_ROOT}/${clean}`;
	}
	return path;
}
