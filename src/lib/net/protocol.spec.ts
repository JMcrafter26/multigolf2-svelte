import { describe, expect, it } from 'vitest';
import { DataMessage, dataMessageType } from './protocol';

describe('DataMessage', () => {
	it('round-trips through its wire format', () => {
		const message = new DataMessage(dataMessageType.KICK_BALL, {
			direction: { x: 1.5, y: -2 },
			ballUid: 'abc'
		});
		const restored = DataMessage.fromString(message.toString());
		expect(restored.type).toBe('kick_ball');
		expect(restored.data).toEqual({ direction: { x: 1.5, y: -2 }, ballUid: 'abc' });
		expect(restored.createTime).toBe(message.createTime);
		expect(restored.receivedTime).toBeNull();
		expect(restored.hostTime).toBeNull();
	});

	it('keeps the legacy message names', () => {
		expect(dataMessageType.PING).toBe('ping');
		expect(dataMessageType.GAMESTATE).toBe('gamestate');
		expect(dataMessageType.CONSTRUCTION_LINE).toBe('construction_line');
		expect(dataMessageType.PLACE_OBJECT).toBe('place_object');
		expect(dataMessageType.CHANGE_OBJECT).toBe('change_object');
		expect(dataMessageType.REMOVE_OBJECT).toBe('remove_object');
		expect(dataMessageType.REQUEST_DIMENSIONS).toBe('request_dimensions');
		expect(dataMessageType.SEND_DIMENSIONS).toBe('send_dimensions');
		expect(dataMessageType.KICK_BALL).toBe('kick_ball');
		expect(dataMessageType.DEVICE_ORIENTATION).toBe('device_orientation');
	});

	it('creates ping messages with a payload', () => {
		const ping = DataMessage.Ping({ index: 2 });
		expect(ping.type).toBe('ping');
		expect(ping.data).toEqual({ index: 2 });
	});
});
