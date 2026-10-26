import { t } from '../i18n/state.svelte';
import { Vector2d } from '../game/vector';
import { apiUrl, TURN_CREDENTIALS_URL } from '../api';
import { DataMessage, rtcDataType } from './protocol';

const RtcBasePingPeriod = 3000;
const RtcBaseCheckForSignalsInterval = 1000;
const RtcBaseClientTimeoutPeriod = 20_000;
const RtcBaseHostTimeoutPeriod = 10_000;

export type RtcStatusColor = 'green' | 'blue' | 'red' | 'orange';

export interface RtcStatus {
	color: RtcStatusColor;
	message: string;
}

export interface RtcOptions {
	logFunction?: (message: string) => void;
	onDataMessage?: (message: DataMessage) => void;
	onDataClose?: () => void;
	index?: number;
	poolUid?: string | null;
}

interface SignalRow {
	id: string;
	type: string;
	uid: string;
	data: Record<string, unknown>;
}

interface SignalMessage {
	sdp: RTCSessionDescriptionInit;
	candidate?: RTCIceCandidateInit;
}

export class RtcBase {
	static pingPeriod = RtcBasePingPeriod;
	static checkForSignalsInterval = RtcBaseCheckForSignalsInterval;
	static clientTimeoutPeriod = RtcBaseClientTimeoutPeriod;
	static hostTimeoutPeriod = RtcBaseHostTimeoutPeriod;

	closePoolApi = apiUrl('close_pool.php');
	getSignalsApi = apiUrl('get_signals.php');
	sendSignalApi = apiUrl('send_signal.php');
	getIceServersApi = TURN_CREDENTIALS_URL;

	logFunction: (message: string) => void;
	onDataMessage: (message: DataMessage) => void;
	onDataClose: () => void;

	peerConnection!: RTCPeerConnection;
	dataChannel!: RTCDataChannel;

	processedSignalIds = new Set<string>();
	dataChannelOpen = false;
	pendingMessages: Array<DataMessage | string> = [];
	signalingUid: string | null = null;
	hasInitted = false;
	lastDataMessage: DataMessage | null = null;
	lastDataMessageTime: number | null = null;
	alive = true;
	index: number;
	poolUid: string | null;
	delayMs = 0;

	constructor({
		logFunction = () => {},
		onDataMessage = () => {},
		onDataClose = () => {},
		index = -1,
		poolUid = null
	}: RtcOptions = {}) {
		this.logFunction = logFunction;
		this.onDataMessage = onDataMessage;
		this.onDataClose = onDataClose;
		this.index = index;
		this.poolUid = poolUid;

		if (!poolUid) throw new Error('poolUid must be given to an RTC handler');
	}

	initDatachannelListeners(): void {
		this.dataChannel.onopen = () => {
			if (!this.alive) return;
			this.logFunction(t('net.connectionEstablished'));
			this.dataChannelOpen = true;
			this.flushPendingMessages();
		};

		this.dataChannel.onmessage = (event: MessageEvent) => {
			if (!this.alive) return;
			const message = DataMessage.fromString(String(event.data));
			message.receivedTime ??= Date.now();
			this.lastDataMessage = message;
			this.lastDataMessageTime = Date.now();
			this.onDataMessage(message);
		};

		this.dataChannel.onclose = () => {
			if (!this.alive) return;
			this.logFunction(t('net.connectionDied'));
			this.dataChannelOpen = false;
			this.die();
			this.onDataClose();
		};
	}

	async init(): Promise<void> {
		if (this.hasInitted) return;
		this.hasInitted = true;
		if (this.debug()) this.logFunction(t('net.initializingPeerToPeer'));

		let iceServers: RTCIceServer[] = [];
		if (this.getIceServersApi) {
			try {
				const response = await fetch(this.getIceServersApi);
				if (response.ok) {
					const fromApi = (await response.json()) as RTCIceServer[];
					if (Array.isArray(fromApi)) iceServers = fromApi;
				}
			} catch (error) {
				this.logFunction(`⚠️ TURN credentials unavailable: ${String(error)}`);
			}
		}

		iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
		iceServers.push(
			{ urls: 'stun:freeturn.net:5349' },
			{ urls: 'turns:freeturn.tel:5349', username: 'free', credential: 'free' }
		);

		this.peerConnection = new RTCPeerConnection({ iceServers });
		this.dataChannel = this.peerConnection.createDataChannel('chat', {
			negotiated: true,
			id: 0
		});
		this.initDatachannelListeners();
	}

	debug(): boolean {
		return typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
	}

	die(): void {
		this.alive = false;
		this.pendingMessages = [];
		try {
			this.dataChannel?.close();
		} catch {
			/* already closed */
		}
		try {
			this.peerConnection?.close();
		} catch {
			/* already closed */
		}
	}

	sendMessage(message: DataMessage | string): boolean {
		if (!this.alive) return false;
		if (!this.dataChannelOpen) {
			// The host can decide to start the game before the data channel has
			// finished opening. Keep early messages around so that they are not
			// silently dropped (the legacy implementation lost e.g. the
			// request_dimensions message in this situation).
			if (this.pendingMessages.length < 100) this.pendingMessages.push(message);
			return false;
		}
		return this.sendMessageNow(message);
	}

	private sendMessageNow(message: DataMessage | string): boolean {
		if (message instanceof DataMessage) {
			message.hostTime = Date.now() + this.delayMs;
			message = message.toString();
		}
		if (!this.alive || !this.dataChannelOpen) return false;
		try {
			this.dataChannel.send(message);
			return true;
		} catch {
			return false;
		}
	}

	private flushPendingMessages(): void {
		if (!this.pendingMessages.length) return;
		const pendingMessages = this.pendingMessages;
		this.pendingMessages = [];
		for (const message of pendingMessages) {
			if (!this.alive || !this.dataChannelOpen) return;
			this.sendMessageNow(message);
		}
	}

	async uploadToServer(
		type: string,
		data: Record<string, unknown>,
		objectName: string,
		logSuccess = true
	): Promise<boolean> {
		try {
			let apiUrl = this.sendSignalApi;
			apiUrl += `?type=${encodeURIComponent(type)}`;
			apiUrl += `&pool_uid=${encodeURIComponent(this.poolUid ?? '')}`;
			apiUrl += `&uid=${encodeURIComponent(this.signalingUid ?? '')}`;
			apiUrl += `&data=${encodeURIComponent(JSON.stringify(data))}`;
			const response = await fetch(apiUrl);
			const textResponse = await response.text();

			if (textResponse === 'worked like a charm') {
				if (logSuccess) this.logFunction(`✅ ${objectName}`);
				return true;
			}
			throw new Error(`Unknown server response: ${textResponse}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logFunction(`⚠️ Couldn't upload ${objectName}: ${message}`);
			throw error;
		}
	}

	async getFromServer(type?: string, uid?: string): Promise<SignalRow[]> {
		try {
			const apiUrl = `${this.getSignalsApi}?pool_uid=${encodeURIComponent(this.poolUid ?? '')}`;
			const response = await fetch(apiUrl);
			const allRows = (await response.json()) as Array<{
				id: string;
				type: string;
				uid: string;
				data: string;
			}>;
			if (!Array.isArray(allRows)) return [];

			let rows = allRows.filter((row) => !this.processedSignalIds.has(row.id));
			if (type !== undefined) rows = rows.filter((row) => row.type === type);
			if (uid !== undefined) rows = rows.filter((row) => row.uid === uid);

			return rows.map((row) => {
				this.processedSignalIds.add(row.id);
				return {
					id: row.id,
					type: row.type,
					uid: row.uid,
					data: JSON.parse(row.data) as Record<string, unknown>
				};
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logFunction(`❌ Couldn't fetch server: ${message}`);
			throw error;
		}
	}

	async waitUntil(
		condition: () => boolean,
		name: string,
		{ timeout = 60_000, checkIntervalMs = 100 } = {}
	): Promise<void> {
		const startWaitTime = Date.now();
		for (;;) {
			if (Date.now() - startWaitTime > timeout) {
				this.die();
				throw new Error(`Timeout while waiting for ${name}`);
			}
			if (!this.alive) throw new Error(`Connection died while waiting for ${name}`);
			if (condition()) return;
			await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
		}
	}

	async checkForUpdates(
		until: () => boolean,
		handleUpdate: (signal: SignalRow) => void | Promise<void>,
		objectName: string,
		{
			checkInterval = RtcBase.checkForSignalsInterval,
			timeoutPeriod = RtcBase.hostTimeoutPeriod
		} = {}
	): Promise<void> {
		const startTime = Date.now();
		while (!until()) {
			const updates = await this.getFromServer(undefined, this.signalingUid ?? undefined);
			if (!this.alive) throw new Error(`Connection died while waiting for ${objectName}`);
			for (const update of updates) await handleUpdate(update);
			if (Date.now() - startTime > timeoutPeriod) {
				this.die();
				throw new Error(`Timeout while waiting for ${objectName}`);
			}
			await new Promise((resolve) => setTimeout(resolve, checkInterval));
		}
	}

	generateSignalingUid(): string {
		return Math.random().toString().slice(2);
	}
}

export class RtcHost extends RtcBase {
	receivedPing: DataMessage | null = null;
	clientDisplaySize: Vector2d | null = null;

	getStatus(): RtcStatus {
		let color: RtcStatusColor = 'green';
		let message = t('net.goodConnection');

		if (!this.lastDataMessageTime) {
			color = 'blue';
			message = t('net.connectionInitializing');
		} else if (Date.now() - this.lastDataMessageTime > RtcBase.pingPeriod * 2) {
			color = 'red';
			message = t('net.connectionTimedOut');
		}

		if (this.lastDataMessage && color === 'green' && this.delayMs > 500) {
			color = 'orange';
			message = t('net.connectionSlow', { ping: Math.round(this.delayMs * 2) });
		}
		return { color, message };
	}

	receivePing(pingMessage: DataMessage): boolean {
		this.receivedPing = pingMessage;
		const data = pingMessage.data as { displaySize?: { x: number; y: number } };
		if (data?.displaySize) {
			const previous = this.clientDisplaySize;
			this.clientDisplaySize = Vector2d.fromObject(data.displaySize);
			if (
				!previous ||
				!this.clientDisplaySize ||
				previous.x !== this.clientDisplaySize.x ||
				previous.y !== this.clientDisplaySize.y
			) {
				return true;
			}
		}
		return false;
	}

	async startPinging(): Promise<void> {
		while (this.alive) {
			const pingStartTime = Date.now();
			this.sendMessage(DataMessage.Ping({ index: this.index }));
			this.receivedPing = null;
			try {
				await this.waitUntil(() => this.receivedPing !== null, 'Pinging');
			} catch {
				return;
			}
			const receivedPing = this.receivedPing as DataMessage | null;
			if (!receivedPing) return;
			const timeElapsed = (receivedPing.receivedTime ?? Date.now()) - pingStartTime;
			this.delayMs = (timeElapsed / 2) * 0.1 + this.delayMs * 0.9;
			await new Promise((resolve) => setTimeout(resolve, RtcBase.pingPeriod));
		}
	}

	async start(signalingUid: string): Promise<void> {
		this.delayMs = 0;
		this.signalingUid = signalingUid;
		this.clientDisplaySize = null;

		await this.init();
		if (!this.alive) return;

		this.peerConnection.addEventListener('icecandidateerror', (event) => {
			if (this.alive && this.debug()) {
				console.log(`[DEBUG] ICE candidate error: ${event.errorText}`);
			}
		});

		this.peerConnection.addEventListener('icecandidate', (event) => {
			if (!this.alive || event.candidate === null) return;
			void this.uploadToServer(
				rtcDataType.HostCandidate,
				{ candidate: event.candidate.toJSON() },
				'Ice Candidate',
				false
			).catch(() => {});
		});

		const offer = await this.peerConnection.createOffer();
		await this.peerConnection.setLocalDescription(offer);
		if (!this.alive) return;

		void this.uploadToServer(
			rtcDataType.Offer,
			{ sdp: this.peerConnection.localDescription },
			'Connection Offer',
			this.debug()
		).catch(() => {});

		await this.checkForUpdates(
			() => this.dataChannelOpen,
			async (signal) => {
				if (signal.type === rtcDataType.AnswerCandidate) {
					const data = signal.data as { candidate: RTCIceCandidateInit };
					await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
				}
				if (signal.type === rtcDataType.Answer) {
					if (this.peerConnection.signalingState !== 'have-local-offer') return;
					const data = signal.data as unknown as SignalMessage;
					await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
					if (data.sdp.type === 'offer') {
						const answer = await this.peerConnection.createAnswer();
						await this.peerConnection.setLocalDescription(answer);
						void this.uploadToServer(
							rtcDataType.Offer,
							{ sdp: this.peerConnection.localDescription },
							'Connection Answer'
						).catch(() => {});
					}
				}
			},
			'RTC Answer',
			{ timeoutPeriod: RtcBase.hostTimeoutPeriod }
		);
	}
}

export class RtcClient extends RtcBase {
	getStatus(): RtcStatus {
		if (!this.dataChannelOpen || !this.lastDataMessageTime) {
			return { color: 'blue', message: t('net.connectionInitializing') };
		}
		if (Date.now() - this.lastDataMessageTime > RtcBase.pingPeriod * 2) {
			return { color: 'red', message: t('net.connectionTimedOut') };
		}
		return { color: 'green', message: t('net.goodConnection') };
	}

	async joinPool(deviceIndex: number | null): Promise<void> {
		await this.uploadToServer(
			rtcDataType.joinPool,
			{ signalingUid: this.signalingUid, deviceIndex },
			'Connection Invitation'
		);
	}

	async start(deviceIndex: number | null = null): Promise<void> {
		await this.init();
		this.signalingUid = this.generateSignalingUid();
		await this.joinPool(deviceIndex);
		if (!this.alive) return;

		this.peerConnection.addEventListener('icecandidateerror', (event) => {
			if (this.alive && this.debug()) {
				console.log(`[DEBUG] ICE candidate error: ${event.errorText}`);
			}
		});

		this.peerConnection.addEventListener('icecandidate', (event) => {
			if (!this.alive || event.candidate === null) return;
			void this.uploadToServer(
				rtcDataType.AnswerCandidate,
				{ candidate: event.candidate.toJSON() },
				'Ice Candidate',
				false
			).catch(() => {});
		});

		await this.checkForUpdates(
			() => this.dataChannelOpen,
			async (signal) => {
				if (signal.type === rtcDataType.HostCandidate) {
					const data = signal.data as { candidate: RTCIceCandidateInit };
					await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
				}
				if (signal.type === rtcDataType.Offer) {
					const data = signal.data as unknown as SignalMessage;
					await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
					if (data.sdp.type === 'offer') {
						const answer = await this.peerConnection.createAnswer();
						await this.peerConnection.setLocalDescription(answer);
						void this.uploadToServer(
							rtcDataType.Answer,
							{ sdp: this.peerConnection.localDescription },
							'Connection Answer'
						).catch(() => {});
					}
				}
			},
			'RTC Offer',
			{ timeoutPeriod: RtcBase.clientTimeoutPeriod }
		);
	}
}

export interface HostManagerOptions {
	logFunction?: (message: string) => void;
	onDataMessage?: (message: DataMessage, connection: RtcHost) => void;
	onClientUrlAvailable?: (url: string) => void;
	onConnectionsChanged?: () => void;
	allowConnectionOverride?: () => boolean;
	allowNewConnections?: () => boolean;
}

export class RtcHostManager {
	static checkForJoinsPeriod = 5000;
	static clientUrl = 'https://multi.golf/client/';
	static openPoolApi = apiUrl('open_pool.php');

	logFunction: (message: string) => void;
	onDataMessage: (message: DataMessage, connection: RtcHost) => void;
	onClientUrlAvailable: (url: string) => void;
	onConnectionsChanged: () => void;
	allowConnectionOverride: () => boolean;
	allowNewConnections: () => boolean;

	poolUid: string | null = null;
	connections: RtcHost[] = [];
	polling = false;
	baseConnection: RtcBase | null = null;

	constructor({
		logFunction = () => {},
		onDataMessage = () => {},
		onClientUrlAvailable = () => {},
		onConnectionsChanged = () => {},
		allowConnectionOverride = () => true,
		allowNewConnections = () => true
	}: HostManagerOptions = {}) {
		this.logFunction = logFunction;
		this.onDataMessage = onDataMessage;
		this.onClientUrlAvailable = onClientUrlAvailable;
		this.onConnectionsChanged = onConnectionsChanged;
		this.allowConnectionOverride = allowConnectionOverride;
		this.allowNewConnections = allowNewConnections;
	}

	makeConnection(deviceIndex: number | null): RtcHost | null {
		if (!this.poolUid) return null;
		let removed = false;
		if (deviceIndex !== null && deviceIndex <= this.connections.length) {
			this.connections[deviceIndex - 1].die();
			removed = true;
		} else if (!this.allowNewConnections()) {
			return null;
		}

		const connection = new RtcHost({
			logFunction: (message) => {
				if (!connection.alive) return;
				this.logFunction(`[${connection.index}] ${message}`);
			},
			onDataMessage: (message) => this.onDataMessage(message, connection),
			onDataClose: () => this.onConnectionsChanged(),
			poolUid: this.poolUid
		});

		if (deviceIndex !== null && deviceIndex <= this.connections.length) {
			this.connections[deviceIndex - 1] = connection;
		} else {
			this.connections.push(connection);
		}
		this.sortConnections();
		if (removed) this.onConnectionsChanged();
		return connection;
	}

	sortConnections(): void {
		// Index 0 is the host. The order is the order clients joined.
		for (let i = 0; i < this.connections.length; i++) this.connections[i].index = i + 1;
	}

	async openPool(): Promise<string> {
		const urlParams = new URLSearchParams(location.search);
		if (urlParams.has('debug') && urlParams.has('p')) {
			return urlParams.get('p') as string;
		}
		// Older links use `code`; accepting it makes local testing painless.
		if (urlParams.has('code')) return urlParams.get('code') as string;

		const response = await fetch(RtcHostManager.openPoolApi);
		if (!response.ok) throw new Error(`open_pool returned ${response.status}`);
		const jsonData = (await response.json()) as { pool_uid?: string };
		if (!jsonData.pool_uid) throw new Error('open_pool did not return a pool_uid');
		return jsonData.pool_uid;
	}

	makeClientUrl(): string {
		return RtcHostManager.clientUrl + `?p=${encodeURIComponent(this.poolUid ?? '')}`;
	}

	async start(): Promise<void> {
		this.poolUid = await this.openPool();
		this.onClientUrlAvailable(this.makeClientUrl());
		this.logFunction(t('net.createdPool', { id: this.poolUid }));
		this.baseConnection = new RtcBase({ poolUid: this.poolUid });
		void this.startPolling();
	}

	async startPolling(): Promise<void> {
		this.polling = true;
		while (this.polling) {
			try {
				await this.pollJoins();
			} catch (error) {
				this.logFunction(`❌ Signaling poll failed: ${String(error)}`);
			}
			this.removeLostConnections();
			await new Promise((resolve) => setTimeout(resolve, RtcHostManager.checkForJoinsPeriod));
		}
	}

	private async pollJoins(): Promise<void> {
		if (!this.baseConnection) return;
		const updates = await this.baseConnection.getFromServer(rtcDataType.joinPool);
		for (const update of updates) {
			let deviceIndex: number | null = Number.parseInt(String(update.data.deviceIndex));
			if (Number.isNaN(deviceIndex)) deviceIndex = null;

			const signalingUid = update.data.signalingUid;
			if (typeof signalingUid !== 'string') continue;

			if (
				deviceIndex !== null &&
				this.connections[deviceIndex - 1] &&
				this.connections[deviceIndex - 1].getStatus().color !== 'red' &&
				this.allowConnectionOverride()
			) {
				deviceIndex = null;
			}

			const connection = this.makeConnection(deviceIndex);
			if (connection) {
				this.onConnectionsChanged();
				connection
					.start(signalingUid)
					.then(() => connection.startPinging())
					.catch((error) => {
						this.logFunction(`❌ Connection failed: ${String(error)}`);
						connection.die();
						this.removeLostConnections();
					});
			}
		}
	}

	removeLostConnections(): void {
		const previousLength = this.connections.length;
		for (const connection of this.connections) {
			if (connection.getStatus().color === 'red' && connection.alive) connection.die();
		}
		this.connections = this.connections.filter((connection) => connection.alive);
		this.sortConnections();
		if (this.connections.length !== previousLength) this.onConnectionsChanged();
	}

	stop(): void {
		this.polling = false;
		for (const connection of this.connections) connection.die();
		this.connections = [];
		this.baseConnection?.die();
		this.baseConnection = null;
		this.onConnectionsChanged();
	}
}
