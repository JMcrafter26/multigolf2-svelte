import { Sprite } from './sprites';

export interface BoardStylingObject {
	g: string;
	i: string;
	o: string;
	p: string;
}

export class BoardStyling {
	constructor(
		public gridSprite: string = Sprite.Grid,
		public customWallInner = 'white',
		public customWallOuter = 'black',
		public pullColor = 'rgba(0, 0, 0, 0.5)'
	) {}

	toObject(): BoardStylingObject {
		return {
			g: this.gridSprite,
			i: this.customWallInner,
			o: this.customWallOuter,
			p: this.pullColor
		};
	}

	static fromObject(obj: BoardStylingObject): BoardStyling {
		return new BoardStyling(obj.g, obj.i, obj.o, obj.p);
	}
}
