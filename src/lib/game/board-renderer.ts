import type { Board } from './board';
import { golfObjectType } from './objects';
import { SpriteCache } from './sprite-cache';
import { calcAveragePos, Vector2d } from './vector';

const darkGreenColorHex = '#00b250';
const midGreenColorHex = '#00e668';
const lightGreenColorHex = '#1dff83';

interface BoardRenderOptions {
	drawConnectionLines?: boolean;
	drawBalls?: boolean;
}

export class BoardRenderer {
	static drawSprite(
		context: CanvasRenderingContext2D,
		centerPos: Vector2d,
		size: Vector2d,
		sprite: string,
		{ angle = 0, imageSmoothing = false } = {}
	): void {
		const image = SpriteCache.image(sprite);
		if (!image) return;

		context.imageSmoothingEnabled = imageSmoothing;
		context.save();
		context.translate(centerPos.x, centerPos.y);
		context.rotate(angle);
		context.globalAlpha = 0.8;
		context.drawImage(image, -size.x / 2, -size.y / 2, size.x, size.y);
		context.restore();
	}

	static drawCustomWall(context: CanvasRenderingContext2D, corners: Vector2d[]): void {
		if (!corners.length) return;
		context.beginPath();
		context.moveTo(corners[0].x, corners[0].y);
		for (let i = 1; i <= corners.length; i++) {
			const point = corners[i % corners.length];
			context.lineTo(point.x, point.y);
		}
		context.strokeStyle = 'black';
		context.fillStyle = 'white';
		context.lineWidth = 1;
		context.lineCap = 'round';
		context.fill();
		context.stroke();
	}

	static strokeRoundedRect(
		context: CanvasRenderingContext2D,
		corners: Vector2d[],
		cornerRadius: number
	): void {
		const lineDeltas = corners.map((corner, index) =>
			corners[(index + 1) % corners.length].sub(corner).normalized.scale(cornerRadius)
		);
		const beforeCorners = corners.map((corner, index) =>
			corner.sub(lineDeltas[(index - 1 + lineDeltas.length) % lineDeltas.length])
		);
		const afterCorners = corners.map((corner, index) => corner.add(lineDeltas[index]));

		for (let i = 0; i < corners.length; i++) {
			if (i === 0) context.moveTo(afterCorners[i].x, afterCorners[i].y);
			else context.lineTo(afterCorners[i].x, afterCorners[i].y);

			const nextBefore = beforeCorners[(i + 1) % corners.length];
			const nextAfter = afterCorners[(i + 1) % corners.length];
			const nextCorner = corners[(i + 1) % corners.length];
			context.lineTo(nextBefore.x, nextBefore.y);
			context.quadraticCurveTo(nextCorner.x, nextCorner.y, nextAfter.x, nextAfter.y);
		}
	}

	static render(
		board: Board,
		context: CanvasRenderingContext2D,
		{ drawConnectionLines = false, drawBalls = true }: BoardRenderOptions = {}
	): void {
		const canvas = context.canvas;
		canvas.style.display = 'block';
		canvas.width = Math.max(1, canvas.clientWidth);
		canvas.height = Math.max(1, canvas.clientHeight);
		if (!board.course.phones.length) return;

		const screenBoard = board.copy();

		const allPoints = screenBoard.course.phones.flatMap((phone) => phone.points);
		let minX = Math.min(...allPoints.map((point) => point.x));
		let minY = Math.min(...allPoints.map((point) => point.y));
		let maxX = Math.max(...allPoints.map((point) => point.x));
		let maxY = Math.max(...allPoints.map((point) => point.y));

		if (maxX - minX < maxY - minY) {
			screenBoard.rotate(Math.PI / -2);
			const rotatedPoints = screenBoard.course.phones.flatMap((phone) => phone.points);
			minX = Math.min(...rotatedPoints.map((point) => point.x));
			minY = Math.min(...rotatedPoints.map((point) => point.y));
			maxX = Math.max(...rotatedPoints.map((point) => point.x));
			maxY = Math.max(...rotatedPoints.map((point) => point.y));
		}

		screenBoard.translate(new Vector2d(-minX, -minY));

		// Scale so that everything fits on screen. Measure in coarse steps but
		// undo the intermediate shrink again so the final zoom equals the last
		// scale that was verified to fit (matches the legacy step-by-step
		// optimization). At least one step is always applied.
		let guard = 0;
		let measured = false;
		while ((!measured || maxX > canvas.width || maxY > canvas.height) && guard < 500) {
			screenBoard.scale(0.95 ** 2);
			const points = screenBoard.course.phones.flatMap((phone) => phone.points);
			maxX = Math.max(...points.map((point) => point.x));
			maxY = Math.max(...points.map((point) => point.y));
			screenBoard.scale(0.95 ** -1);
			measured = true;
			guard++;
		}
		screenBoard.scale(0.95);

		const averagePos = calcAveragePos([new Vector2d(0, 0), new Vector2d(maxX, maxY)]);
		screenBoard.translate(new Vector2d(canvas.width / 2, canvas.height / 2).sub(averagePos));

		const phoneCount = screenBoard.course.phones.length;
		const overlaps = screenBoard.course.getOverlaps();
		screenBoard.course.phones.push(...overlaps);

		const phoneCornerRadius = 10;
		for (let i = 0; i < screenBoard.course.phones.length; i++) {
			context.beginPath();
			const phone = screenBoard.course.phones[i];
			this.strokeRoundedRect(context, phone.points, phoneCornerRadius);
			context.strokeStyle = darkGreenColorHex;
			context.lineWidth = 1;
			context.fillStyle = i >= phoneCount ? 'rgba(255, 0, 0, 1)' : lightGreenColorHex;
			context.fill();
			context.stroke();
		}

		for (let i = 0; i < phoneCount; i++) {
			const phone = screenBoard.course.phones[i];
			const midpoint = calcAveragePos(phone.points);
			context.font = `bold ${Math.min(phone.size.x, phone.size.y) * 0.4}px Arial`;
			context.textBaseline = 'middle';
			context.textAlign = 'center';
			context.fillStyle = midGreenColorHex;
			context.save();
			context.translate(midpoint.x, midpoint.y);
			context.rotate(phone.angle);
			context.fillText(String(i + 1), 0, 0);
			context.restore();
		}

		if (drawConnectionLines) {
			for (const line of screenBoard.course.lines) {
				context.beginPath();
				context.moveTo(line.start.x, line.start.y);
				context.lineTo(line.end.x, line.end.y);
				context.lineWidth = 5;
				context.strokeStyle = line.color;
				context.stroke();
			}
		}

		for (const object of screenBoard.objects) {
			if (object.type === golfObjectType.CustomWall) {
				this.drawCustomWall(context, object.corners);
			} else {
				this.drawSprite(context, object.pos, object.size, object.sprite, {
					angle: object.angle
				});
			}
		}

		if (drawBalls) {
			for (const ball of screenBoard.balls) {
				this.drawSprite(
					context,
					ball.pos,
					new Vector2d(ball.radius, ball.radius).scale(2),
					ball.spriteUrl,
					{ angle: ball.rotationAngle }
				);
			}
		}
	}
}
