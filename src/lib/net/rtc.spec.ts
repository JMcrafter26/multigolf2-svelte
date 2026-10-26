import { describe, expect, it } from 'vitest';
import { DataMessage } from './protocol';
import { RtcBase } from './rtc';

function makeBase(): { base: RtcBase; sent: string[] } {
	const base = new RtcBase({ poolUid: 'test-pool' });
	const sent: string[] = [];
	base.dataChannel = {
		send: (message: string) => sent.push(message),
		close: () => {}
	} as unknown as RTCDataChannel;
	return { base, sent };
}

function flush(base: RtcBase): void {
	(base as unknown as { flushPendingMessages: () => void }).flushPendingMessages();
}

describe('RtcBase message queue', () => {
	it('queues messages until the data channel is open', () => {
		const { base, sent } = makeBase();
		base.dataChannelOpen = false;

		expect(base.sendMessage(new DataMessage('request_dimensions'))).toBe(false);
		expect(base.sendMessage('raw-message')).toBe(false);
		expect(sent).toEqual([]);
		expect(base.pendingMessages).toHaveLength(2);

		base.dataChannelOpen = true;
		flush(base);

		expect(sent).toHaveLength(2);
		expect(JSON.parse(sent[0])).toMatchObject({ type: 'request_dimensions' });
		expect(sent[1]).toBe('raw-message');
		expect(base.pendingMessages).toEqual([]);
	});

	it('sends immediately once the channel is open', () => {
		const { base, sent } = makeBase();
		base.dataChannelOpen = true;

		expect(base.sendMessage(new DataMessage('ping', { index: 1 }))).toBe(true);
		expect(sent).toHaveLength(1);
		expect(JSON.parse(sent[0])).toMatchObject({ type: 'ping', data: { index: 1 } });
		expect(base.pendingMessages).toEqual([]);
	});

	it('drops queued messages when the connection dies', () => {
		const { base, sent } = makeBase();
		base.dataChannelOpen = false;
		base.sendMessage('queued');
		base.die();

		expect(base.pendingMessages).toEqual([]);
		expect(base.alive).toBe(false);
		expect(sent).toEqual([]);
	});
});
