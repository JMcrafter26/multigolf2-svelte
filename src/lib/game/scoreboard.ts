import type { Player } from './gamestate';
import { Vector2d } from './vector';

/** Renders the shareable result table, matching the legacy scoreboard style. */
export class ScoreboardMaker {
	static drawLine(
		context: CanvasRenderingContext2D,
		from: Vector2d,
		to: Vector2d,
		width = 2,
		color = 'black'
	): void {
		context.beginPath();
		context.strokeStyle = color;
		context.lineWidth = width;
		context.moveTo(from.x, from.y);
		context.lineTo(to.x, to.y);
		context.stroke();
	}

	static makeImg(players: Player[]): string {
		if (typeof document === 'undefined') return '';
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) return '';

		const fontFamily = 'Arial';
		const fontSize = 40;
		const tablePadding = 20;
		const tableTopOffset = 25;
		const rowHeight = 30;
		context.font = `${fontSize}px ${fontFamily}`;

		const minNameWidth = context.measureText('00').width;
		const nameWidths = players.map((player) =>
			Math.max(context.measureText(player.name).width, minNameWidth)
		);
		const columnWidths = [context.measureText('000').width, ...nameWidths];
		const columnXs: number[] = [];
		let sum = 0;
		for (const width of columnWidths) {
			columnXs.push(sum + tablePadding);
			sum += width + tablePadding * 2;
		}

		const imgWidth = sum;
		const imgHeight = (columnWidths.length + 1) * (rowHeight + tablePadding * 2);
		const rowYs = Array.from(
			{ length: columnWidths.length + 1 },
			(_, index) => index * (rowHeight + tablePadding * 2) + tablePadding + tableTopOffset
		);

		canvas.width = Math.max(1, imgWidth);
		canvas.height = Math.max(1, imgHeight);
		context.font = `${fontSize}px ${fontFamily}`;
		context.fillStyle = 'white';
		context.fillRect(0, 0, canvas.width, canvas.height);

		const tableContent = rowYs.map(() => columnXs.map(() => ''));
		tableContent[0][0] = 'R#';
		for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
			tableContent[0][playerIndex + 1] = players[playerIndex].name;
			tableContent[players.length + 1][playerIndex + 1] = players[playerIndex].score.toString();
			tableContent[playerIndex + 1][0] = `  ${playerIndex + 1}`;
			for (let round = 0; round < players[playerIndex].roundScores.length; round++) {
				tableContent[round + 1][playerIndex + 1] = String(players[playerIndex].roundScores[round]);
			}
		}

		const tablePos = (row: number, column: number) => new Vector2d(columnXs[column], rowYs[row]);
		context.fillStyle = 'black';
		for (let column = 0; column < columnXs.length; column++) {
			for (let row = 0; row < rowYs.length; row++) {
				const pos = tablePos(row, column);
				context.font =
					row === rowYs.length - 1
						? `bold ${fontSize}px ${fontFamily}`
						: `${fontSize}px ${fontFamily}`;
				context.fillText(tableContent[row][column], pos.x, pos.y);
			}
		}

		for (let i = 0; i < players.length - 1; i++) {
			this.drawLine(
				context,
				tablePos(i + 1, 1)
					.addY(tablePadding)
					.addX(-tablePadding),
				tablePos(i + 1, players.length)
					.addY(tablePadding)
					.addX(columnWidths[players.length]),
				2,
				'#ccc'
			);
			this.drawLine(
				context,
				tablePos(1, i + 2)
					.addX(-tablePadding)
					.addY(-rowHeight - tablePadding),
				tablePos(players.length, i + 2)
					.addX(-tablePadding)
					.addY(tablePadding * 2 + rowHeight),
				2,
				'#ccc'
			);
		}

		this.drawLine(
			context,
			tablePos(0, 0).addY(tablePadding),
			tablePos(0, players.length).addY(tablePadding).addX(columnWidths[players.length]),
			3
		);
		this.drawLine(
			context,
			tablePos(players.length, 0).addY(tablePadding),
			tablePos(players.length, players.length)
				.addY(tablePadding)
				.addX(columnWidths[players.length]),
			3
		);
		this.drawLine(
			context,
			tablePos(0, 1).addX(-tablePadding).addY(-rowHeight),
			tablePos(players.length, 1)
				.addX(-tablePadding)
				.addY(tablePadding * 2 + rowHeight),
			3
		);

		return canvas.toDataURL('image/png');
	}
}
