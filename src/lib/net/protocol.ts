export const dataMessageType = {
	PING: 'ping',
	GAMESTATE: 'gamestate',
	CONSTRUCTION_LINE: 'construction_line',
	PLACE_OBJECT: 'place_object',
	CHANGE_OBJECT: 'change_object',
	REMOVE_OBJECT: 'remove_object',
	REQUEST_DIMENSIONS: 'request_dimensions',
	SEND_DIMENSIONS: 'send_dimensions',
	KICK_BALL: 'kick_ball',
	DEVICE_ORIENTATION: 'device_orientation'
} as const;

export type DataMessageType = (typeof dataMessageType)[keyof typeof dataMessageType];

export interface WireVector {
	x: number;
	y: number;
}

export interface DataMessageObject<T = unknown> {
	type: DataMessageType | string;
	data: T;
	createTime: number;
	receivedTime: number | null;
	hostTime: number | null;
}

export class DataMessage<T = Record<string, unknown>> {
	type: DataMessageType | string;
	data: T;
	createTime: number;
	hostTime: number | null;
	receivedTime: number | null;

	constructor(
		type: DataMessageType | string,
		data = {} as T,
		createTime = Date.now(),
		receivedTime: number | null = null,
		hostTime: number | null = null
	) {
		this.type = type;
		this.data = data;
		this.createTime = createTime;
		this.receivedTime = receivedTime;
		this.hostTime = hostTime;
	}

	static fromObject<T = Record<string, unknown>>(obj: DataMessageObject<T>): DataMessage<T> {
		return new DataMessage(obj.type, obj.data, obj.createTime, obj.receivedTime, obj.hostTime);
	}

	static fromString<T = Record<string, unknown>>(jsonString: string): DataMessage<T> {
		return DataMessage.fromObject<T>(JSON.parse(jsonString) as DataMessageObject<T>);
	}

	static Ping(data: Record<string, unknown> = {}): DataMessage {
		return new DataMessage(dataMessageType.PING, data);
	}

	toString(): string {
		return JSON.stringify({
			type: this.type,
			data: this.data,
			createTime: this.createTime,
			receivedTime: this.receivedTime,
			hostTime: this.hostTime
		});
	}
}

export const rtcDataType = {
	openPool: 'open_pool',
	joinPool: 'join_pool',
	Offer: 'offer',
	Answer: 'answer',
	HostCandidate: 'host-candidate',
	AnswerCandidate: 'answer-candidate'
} as const;
