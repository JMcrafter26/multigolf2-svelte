import { Board } from './board';
import { golfObjectType, GolfObject } from './objects';
import { Course, PhoneConnectionLine, PhoneCoordinates } from './phone-coordinates';
import { calcAveragePos, Vector2d } from './vector';

export interface RandomObjectOptions {
	objectType?:
		typeof golfObjectType.Lava | typeof golfObjectType.Cannon | typeof golfObjectType.GravityBox;
	maxTries?: number;
	numObjects?: number;
}

export class BoardGenerator {
	constructor(public screenSizes: Vector2d[]) {}

	generateLinearCourse(): Course {
		const phones = this.screenSizes.map((size) => PhoneCoordinates.fromWidthHeight(size.x, size.y));
		const course = new Course([phones.shift()!]);

		while (phones.length) {
			const previousPhone = course.phones[course.phones.length - 1];
			const phone = phones.shift()!;
			const bottomMidX = (previousPhone.bottomLeft.x + previousPhone.bottomRight.x) / 2;
			const topMidX = (phone.topLeft.x + phone.topRight.x) / 2;
			phone.translate(new Vector2d(bottomMidX - topMidX, previousPhone.maxXY.y));
			course.addPhone(phone);
		}
		return course;
	}

	getConnectingLines(previousPhone: PhoneCoordinates, phone: PhoneCoordinates) {
		const horizontalOffset = Math.max(
			previousPhone.minXY.x + previousPhone.maxXY.x - phone.minXY.x - phone.maxXY.x,
			0
		);
		const verticalOffset = Math.max(
			previousPhone.minXY.y + previousPhone.maxXY.y - phone.minXY.y - phone.maxXY.y,
			0
		);

		return [
			// upper corners
			new PhoneConnectionLine(
				new Vector2d(0, 0),
				new Vector2d(Math.min(previousPhone.size.x, phone.size.x), 0)
			),
			new PhoneConnectionLine(
				new Vector2d(previousPhone.size.x, 0),
				new Vector2d(previousPhone.size.x, Math.min(phone.size.y, previousPhone.size.y))
			),
			new PhoneConnectionLine(
				new Vector2d(Math.max(previousPhone.maxXY.x - phone.maxXY.x, 0), previousPhone.size.y),
				new Vector2d(previousPhone.size.x, previousPhone.size.y)
			),
			new PhoneConnectionLine(
				new Vector2d(0, Math.max(0, previousPhone.maxXY.y - phone.maxXY.y)),
				new Vector2d(0, previousPhone.size.y)
			),

			// lower corners
			new PhoneConnectionLine(
				new Vector2d(Math.max(previousPhone.maxXY.x - phone.maxXY.x, 0), 0),
				new Vector2d(previousPhone.size.x, 0)
			),
			new PhoneConnectionLine(
				new Vector2d(previousPhone.size.x, Math.max(0, previousPhone.maxXY.y - phone.maxXY.y)),
				new Vector2d(previousPhone.size.x, previousPhone.size.y)
			),
			new PhoneConnectionLine(
				new Vector2d(0, previousPhone.size.y),
				new Vector2d(Math.min(previousPhone.size.x, phone.size.x), previousPhone.size.y)
			),
			new PhoneConnectionLine(
				new Vector2d(0, 0),
				new Vector2d(0, Math.min(phone.size.y, previousPhone.size.y))
			),

			// middle connections
			new PhoneConnectionLine(
				new Vector2d(horizontalOffset / 2, 0),
				new Vector2d(previousPhone.size.x - horizontalOffset / 2, 0)
			),
			new PhoneConnectionLine(
				new Vector2d(previousPhone.size.x, verticalOffset / 2),
				new Vector2d(previousPhone.size.x, previousPhone.size.y - verticalOffset / 2)
			),
			new PhoneConnectionLine(
				new Vector2d(horizontalOffset / 2, previousPhone.size.y),
				new Vector2d(previousPhone.size.x - horizontalOffset / 2, previousPhone.size.y)
			),
			new PhoneConnectionLine(
				new Vector2d(0, verticalOffset / 2),
				new Vector2d(0, previousPhone.size.y - verticalOffset / 2)
			)
		];
	}

	getPhoneAlignOptions(previousPhone: PhoneCoordinates, phone: PhoneCoordinates): Vector2d[] {
		const horizontalOffset =
			previousPhone.minXY.x + previousPhone.maxXY.x - phone.minXY.x - phone.maxXY.x;
		const verticalOffset =
			previousPhone.minXY.y + previousPhone.maxXY.y - phone.minXY.y - phone.maxXY.y;

		return [
			new Vector2d(0, -phone.size.y),
			new Vector2d(previousPhone.size.x, 0),
			new Vector2d(previousPhone.maxXY.x - phone.maxXY.x, previousPhone.size.y),
			new Vector2d(-phone.size.x, previousPhone.maxXY.y - phone.maxXY.y),

			new Vector2d(previousPhone.maxXY.x - phone.maxXY.x, -phone.size.y),
			new Vector2d(previousPhone.size.x, previousPhone.maxXY.y - phone.maxXY.y),
			new Vector2d(0, previousPhone.size.y),
			new Vector2d(-phone.size.x, 0),

			new Vector2d(horizontalOffset / 2, -phone.size.y),
			new Vector2d(previousPhone.size.x, verticalOffset / 2),
			new Vector2d(horizontalOffset / 2, previousPhone.size.y),
			new Vector2d(-phone.size.x, verticalOffset / 2)
		];
	}

	getStartHolePositions(phone: PhoneCoordinates): Vector2d[] {
		return [
			new Vector2d(0, phone.size.y / 4),
			new Vector2d(-phone.size.x / 4, 0),
			new Vector2d(0, -phone.size.y / 4),
			new Vector2d(phone.size.x / 4, 0),

			new Vector2d(0, phone.size.y / 4),
			new Vector2d(-phone.size.x / 4, 0),
			new Vector2d(0, -phone.size.y / 4),
			new Vector2d(phone.size.x / 4, 0),

			new Vector2d(0, phone.size.y / 4),
			new Vector2d(-phone.size.x / 4, 0),
			new Vector2d(0, -phone.size.y / 4),
			new Vector2d(phone.size.x / 4, 0)
		];
	}

	generateRandomCourse({ linear = false } = {}): Course {
		let phones = this.screenSizes.map((size) => PhoneCoordinates.fromWidthHeight(size.x, size.y));
		const course = new Course([phones.shift()!]);
		course.alignOptions = [];

		let phoneTries = 0;
		let totalTries = 0;
		while (phones.length) {
			const previousPhone = course.phones[course.phones.length - 1];
			const phone = phones.shift()!;

			if ((!linear && Math.random() < 0.5) || (linear && phone.size.x > phone.size.y)) {
				phone.rotate(Math.PI / 2);
			}

			phone.translate(previousPhone.minXY.sub(phone.minXY));
			const translateOptions = this.getPhoneAlignOptions(previousPhone, phone);
			let alignOption = Math.floor(Math.random() * translateOptions.length);
			if (linear) alignOption = 10;
			course.alignOptions.push(alignOption);

			const lineOptions = this.getConnectingLines(previousPhone, phone);
			course.addLine(lineOptions[alignOption].translate(phone.minXY));
			phone.translate(translateOptions[alignOption]);
			course.addPhone(phone);

			const previousPhones = course.phones.slice(0, -2);
			const overlapsPrevious = previousPhones.some((candidate) => candidate.hasOverlap(phone));

			if (overlapsPrevious) {
				phones.unshift(course.phones.pop()!);
				course.alignOptions.pop();
				course.lines.pop();
				phoneTries++;
			} else {
				phoneTries = 0;
			}

			if (phoneTries > 20) {
				phones = this.screenSizes.map((size) => PhoneCoordinates.fromWidthHeight(size.x, size.y));
				course.alignOptions = [];
				course.phones = [phones.shift()!];
				course.lines = [];
				phoneTries = 0;
				totalTries++;
			}

			if (totalTries > 10_000) {
				throw new Error("Couldn't generate course: too many tries");
			}
		}

		// Give each connection a new random colour rather than the colour of the
		// temporary connection line used to calculate alignment.
		for (const line of course.lines) {
			line.color = new PhoneConnectionLine().color;
		}
		return course;
	}

	placeStartAndHole(board: Board): void {
		const start = GolfObject.makeDefault(golfObjectType.Start);
		const hole = GolfObject.makeDefault(golfObjectType.Hole);

		if (board.course.phones.length > 1) {
			const firstAlignOption = board.course.alignOptions[0];
			let lastAlignOption = board.course.alignOptions[board.course.alignOptions.length - 1];
			lastAlignOption = Math.floor(lastAlignOption / 4) * 4 + ((lastAlignOption + 2) % 4);

			const startOptions = this.getStartHolePositions(board.course.phones[0]);
			const holeOptions = this.getStartHolePositions(
				board.course.phones[board.course.phones.length - 1]
			);
			const firstMiddle = calcAveragePos(board.course.phones[0].points);
			const lastMiddle = calcAveragePos(board.course.phones[board.course.phones.length - 1].points);
			start.setPos(firstMiddle.add(startOptions[firstAlignOption]));
			hole.setPos(lastMiddle.add(holeOptions[lastAlignOption]));
		} else {
			const phone = board.course.phones[0];
			const middle = calcAveragePos(phone.points);
			const delta = middle.sub(phone.corners[0]).scale(0.6);
			start.setPos(middle.sub(delta));
			hole.setPos(middle.add(delta));
		}

		board.objects.push(start, hole);
	}

	generate(): Board {
		const board = new Board();
		board.course = this.generateRandomCourse({ linear: Math.random() < 0.1 });
		this.placeStartAndHole(board);
		return board;
	}

	static async placeObjectsRandomly(
		board: Board,
		{ objectType = golfObjectType.Lava, maxTries = 10, numObjects = 3 }: RandomObjectOptions = {}
	): Promise<boolean> {
		function randomCoursePos(): Vector2d {
			const areaSum = board.course.phones.reduce((sum, phone) => sum + phone.area, 0);
			const random = Math.random() * areaSum;
			let cumulative = 0;
			for (const phone of board.course.phones) {
				cumulative += phone.area;
				if (cumulative >= random) return phone.randomPosInside();
			}
			return board.course.phones[0]?.randomPosInside() ?? new Vector2d();
		}

		for (let attempt = 0; attempt < maxTries; attempt++) {
			const addedUids: string[] = [];
			for (let i = 0; i < numObjects; i++) {
				const object = GolfObject.makeDefault(objectType);
				object.setPos(randomCoursePos());
				object.setAngle(Math.random() * 2 * Math.PI);
				object.setSize(object.size.scale(0.8 + Math.random() * 0.4));
				board.objects.push(object);
				addedUids.push(object.uid);
			}

			// Collision simulation is intentionally skipped: the legacy code also
			// returned immediately and its test was too slow for mobile hosts.
			return true;
		}
		return false;
	}
}
