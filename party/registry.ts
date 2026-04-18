import type * as Party from 'partykit/server';
import type { UniverseSchema } from '../src/lib/universe/types';

export interface RoomEntry {
	roomId: string;
	schema: UniverseSchema;
	playerCount: number;
	createdAt: number;
	lastActive: number;
}

interface RegistryData {
	rooms: Record<string, RoomEntry>;
}

const ADMIN_TOKEN_HEADER = 'x-admin-token';

export default class Registry implements Party.Server {
	constructor(readonly room: Party.Room) {}

	async onRequest(req: Party.Request): Promise<Response> {
		const cors = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': ADMIN_TOKEN_HEADER,
		};

		if (req.method === 'OPTIONS') {
			return new Response(null, { headers: cors });
		}

		if (req.method === 'GET') {
			const token = req.headers.get(ADMIN_TOKEN_HEADER);
			const expected = (this.room.env as Record<string, string>)['ADMIN_TOKEN'];
			if (!expected || token !== expected) {
				return new Response('Unauthorized', { status: 401, headers: cors });
			}
			const data = (await this.room.storage.get<RegistryData>('data')) ?? { rooms: {} };
			return Response.json(data, { headers: cors });
		}

		if (req.method === 'POST') {
			const entry = (await req.json()) as RoomEntry;
			const data = (await this.room.storage.get<RegistryData>('data')) ?? { rooms: {} };
			data.rooms[entry.roomId] = { ...data.rooms[entry.roomId], ...entry };
			await this.room.storage.put('data', data);
			return new Response('OK', { headers: cors });
		}

		if (req.method === 'DELETE') {
			const { roomId } = (await req.json()) as { roomId: string };
			const data = (await this.room.storage.get<RegistryData>('data')) ?? { rooms: {} };
			delete data.rooms[roomId];
			await this.room.storage.put('data', data);
			return new Response('OK', { headers: cors });
		}

		return new Response('Method not allowed', { status: 405 });
	}
}
