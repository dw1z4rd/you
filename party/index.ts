import type * as Party from 'partykit/server';
import type { RoomState, PlayerInfo, ClientMessage, ServerMessage } from '../src/lib/multiplayer/types';
import type { RoomEntry } from './registry';

type Env = { registry: Party.Party };

export default class YouRoom implements Party.Server<Env> {
	private players = new Map<string, PlayerInfo>();

	constructor(readonly room: Party.Room<Env>) {}

	async onConnect(conn: Party.Connection) {
		const msg: ServerMessage = { type: 'connected', yourId: conn.id };
		conn.send(JSON.stringify(msg));
	}

	async onMessage(raw: string, sender: Party.Connection) {
		let msg: ClientMessage;
		try { msg = JSON.parse(raw); } catch { return; }

		switch (msg.type) {
			case 'join':            await this.handleJoin(sender, msg);            break;
			case 'position':             this.handlePosition(sender, msg);         break;
			case 'request_permission':   await this.handleRequestPermission(sender); break;
			case 'grant_permission':  await this.handleGrant(sender, msg.connectionId); break;
			case 'revoke_permission': await this.handleRevoke(sender, msg.connectionId); break;
			case 'universe_update':  await this.handleUniverseUpdate(sender, msg.universe); break;
		}
	}

	async onClose(conn: Party.Connection) {
		this.players.delete(conn.id);
		const msg: ServerMessage = { type: 'player_left', id: conn.id };
		this.room.broadcast(JSON.stringify(msg));
		await this.pingRegistry({ playerCountDelta: -1 });
	}

	// ── handlers ────────────────────────────────────────────────────────────────

	private async handleJoin(
		conn: Party.Connection,
		msg: Extract<ClientMessage, { type: 'join' }>
	) {
		let state = await this.room.storage.get<RoomState>('state');

		if (!state) {
			if (!msg.schema || !msg.ownerSecret) {
				const err: ServerMessage = { type: 'error', message: 'Room not found. Ask the owner to share their link.' };
				conn.send(JSON.stringify(err));
				return;
			}
			state = {
				ownerSecret: msg.ownerSecret,
				ownerId: conn.id,
				schema: msg.schema,
				universe: msg.universe ?? { answers: [] },
				synthesis: msg.synthesis ?? null,
				permissions: [],
			};
			await this.room.storage.put('state', state);
		}

		const isOwner = !!msg.ownerSecret && msg.ownerSecret === state.ownerSecret;
		if (isOwner) {
			state.ownerId = conn.id;
			await this.room.storage.put('state', state);
		}

		const info: PlayerInfo = { id: conn.id, isOwner, x: 0, y: 2, z: isOwner ? 10 : 5, rotY: 0 };
		this.players.set(conn.id, info);

		const others = [...this.players.values()].filter(p => p.id !== conn.id);
		const welcome: ServerMessage = { type: 'welcome', yourId: conn.id, isOwner, state, players: others };
		conn.send(JSON.stringify(welcome));

		const joined: ServerMessage = { type: 'player_joined', player: info };
		this.room.broadcast(JSON.stringify(joined), [conn.id]);

		await this.pingRegistry({ schema: state.schema, playerCountDelta: 1 });
	}

	private handlePosition(
		sender: Party.Connection,
		msg: Extract<ClientMessage, { type: 'position' }>
	) {
		const player = this.players.get(sender.id);
		if (!player) return;
		player.x = msg.x; player.y = msg.y; player.z = msg.z; player.rotY = msg.rotY;
		const out: ServerMessage = { type: 'player_position', id: sender.id, x: msg.x, y: msg.y, z: msg.z, rotY: msg.rotY };
		this.room.broadcast(JSON.stringify(out), [sender.id]);
	}

	private async handleRequestPermission(sender: Party.Connection) {
		const state = await this.room.storage.get<RoomState>('state');
		if (!state) return;
		const owner = this.findConnection(state.ownerId);
		if (!owner) return;
		const msg: ServerMessage = { type: 'permission_request', id: sender.id };
		owner.send(JSON.stringify(msg));
	}

	private async handleGrant(sender: Party.Connection, targetId: string) {
		const state = await this.room.storage.get<RoomState>('state');
		if (!state || sender.id !== state.ownerId) return;
		if (!state.permissions.includes(targetId)) state.permissions.push(targetId);
		await this.room.storage.put('state', state);
		const msg: ServerMessage = { type: 'permissions_update', permissions: state.permissions };
		this.room.broadcast(JSON.stringify(msg));
	}

	private async handleRevoke(sender: Party.Connection, targetId: string) {
		const state = await this.room.storage.get<RoomState>('state');
		if (!state || sender.id !== state.ownerId) return;
		state.permissions = state.permissions.filter(id => id !== targetId);
		await this.room.storage.put('state', state);
		const msg: ServerMessage = { type: 'permissions_update', permissions: state.permissions };
		this.room.broadcast(JSON.stringify(msg));
	}

	private async handleUniverseUpdate(sender: Party.Connection, universe: RoomState['universe']) {
		const state = await this.room.storage.get<RoomState>('state');
		if (!state) return;
		if (sender.id !== state.ownerId && !state.permissions.includes(sender.id)) return;
		state.universe = universe;
		await this.room.storage.put('state', state);
		const msg: ServerMessage = { type: 'universe_update', universe };
		this.room.broadcast(JSON.stringify(msg));
	}

	private findConnection(id: string): Party.Connection | undefined {
		for (const conn of this.room.connections) {
			if (conn.id === id) return conn;
		}
	}

	private async pingRegistry(opts: { schema?: RoomState['schema']; playerCountDelta?: number } = {}) {
		try {
			const stored = await this.room.storage.get<RoomState>('state');
			const current = await this.room.storage.get<RoomEntry>('registry_entry');
			const now = Date.now();

			const entry: RoomEntry = {
				roomId:      this.room.id,
				schema:      opts.schema ?? current?.schema ?? stored?.schema ?? ({} as RoomState['schema']),
				playerCount: Math.max(0, (current?.playerCount ?? 0) + (opts.playerCountDelta ?? 0)),
				createdAt:   current?.createdAt ?? now,
				lastActive:  now,
			};

			await this.room.storage.put('registry_entry', entry);

			const registry = this.room.context.parties['registry'];
			const stub = registry.get('global');
			await stub.fetch('https://placeholder/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(entry),
			});
		} catch {
			// Registry unavailable — game continues normally
		}
	}
}
