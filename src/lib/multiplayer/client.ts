import PartySocket from 'partysocket';
import type { ClientMessage, ServerMessage, RoomState, PlayerInfo } from './types';
import type { UniverseState } from '../universe/types';

export type WelcomeData = {
	yourId: string;
	isOwner: boolean;
	state: RoomState;
	players: Record<string, PlayerInfo>;
};

export class RoomClient {
	private socket: PartySocket;
	private positionTimer: ReturnType<typeof setInterval> | null = null;

	onWelcome:           ((data: WelcomeData) => void)                                      | null = null;
	onPlayerJoined:      ((player: PlayerInfo) => void)                                     | null = null;
	onPlayerLeft:        ((id: string) => void)                                              | null = null;
	onPlayerPosition:    ((id: string, x: number, y: number, z: number, rotY: number) => void) | null = null;
	onPermissionRequest: ((id: string) => void)                                              | null = null;
	onPermissionsUpdate: ((permissions: string[]) => void)                                   | null = null;
	onUniverseUpdate:    ((universe: UniverseState) => void)                                 | null = null;
	onError:             ((message: string) => void)                                         | null = null;

	constructor(roomId: string, host: string) {
		this.socket = new PartySocket({ host, room: roomId });
		this.socket.addEventListener('message', (e: MessageEvent) => {
			this.dispatch(JSON.parse(e.data) as ServerMessage);
		});
	}

	join(opts: Pick<Extract<ClientMessage, { type: 'join' }>, 'ownerSecret' | 'schema' | 'universe' | 'synthesis'> = {}) {
		this.send({ type: 'join', ...opts });
	}

	sendPosition(pos: { x: number; y: number; z: number; rotY: number }) {
		this.send({ type: 'position', ...pos });
	}

	startPositionSync(getPos: () => { x: number; y: number; z: number; rotY: number }, intervalMs = 80) {
		this.stopPositionSync();
		this.positionTimer = setInterval(() => this.sendPosition(getPos()), intervalMs);
	}

	stopPositionSync() {
		if (this.positionTimer) { clearInterval(this.positionTimer); this.positionTimer = null; }
	}

	requestPermission()             { this.send({ type: 'request_permission' }); }
	grantPermission(id: string)     { this.send({ type: 'grant_permission', connectionId: id }); }
	revokePermission(id: string)    { this.send({ type: 'revoke_permission', connectionId: id }); }

	dispose() {
		this.stopPositionSync();
		this.socket.close();
	}

	private send(msg: ClientMessage) {
		this.socket.send(JSON.stringify(msg));
	}

	private dispatch(msg: ServerMessage) {
		switch (msg.type) {
			case 'welcome': {
				const players: Record<string, PlayerInfo> = {};
				for (const p of msg.players) players[p.id] = p;
				this.onWelcome?.({ yourId: msg.yourId, isOwner: msg.isOwner, state: msg.state, players });
				break;
			}
			case 'player_joined':     this.onPlayerJoined?.(msg.player); break;
			case 'player_left':       this.onPlayerLeft?.(msg.id); break;
			case 'player_position':   this.onPlayerPosition?.(msg.id, msg.x, msg.y, msg.z, msg.rotY); break;
			case 'permission_request':this.onPermissionRequest?.(msg.id); break;
			case 'permissions_update':this.onPermissionsUpdate?.(msg.permissions); break;
			case 'universe_update':   this.onUniverseUpdate?.(msg.universe); break;
			case 'error':             this.onError?.(msg.message); break;
		}
	}
}

export function generateRoomId(): string {
	return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function generateSecret(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}
