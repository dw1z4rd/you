import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import type { RoomEntry } from '../../../../party/registry';
import type { UniverseSchema } from '$lib/universe/types';

export interface Stats {
	totalRooms:    number;
	activeRooms:   number;
	activePlayers: number;
	rooms:         RoomEntry[];
	distributions: SchemaDistributions;
}

type SchemaDistributions = {
	[K in keyof UniverseSchema]: Record<string, number>;
};

export const load: PageServerLoad = async ({ fetch }) => {
	const host     = env.PARTYKIT_HOST    ?? 'localhost:1999';
	const token    = env.ADMIN_TOKEN      ?? '';
	const protocol = host.startsWith('localhost')   ? 'http' : 'https';

	let rooms: RoomEntry[] = [];

	try {
		const res = await fetch(`${protocol}://${host}/parties/registry/global`, {
			headers: { 'x-admin-token': token },
		});
		if (res.ok) {
			const data = await res.json() as { rooms: Record<string, RoomEntry> };
			rooms = Object.values(data.rooms);
		}
	} catch {
		// PartyKit not running or registry empty — return empty stats
	}

	const distributions = computeDistributions(rooms);

	const stats: Stats = {
		totalRooms:    rooms.length,
		activeRooms:   rooms.filter(r => r.playerCount > 0).length,
		activePlayers: rooms.reduce((sum, r) => sum + r.playerCount, 0),
		rooms:         rooms.sort((a, b) => b.lastActive - a.lastActive),
		distributions,
	};

	return { stats };
};

function computeDistributions(rooms: RoomEntry[]): SchemaDistributions {
	const fields: (keyof UniverseSchema)[] = [
		'consciousness', 'identity', 'time', 'causality', 'meaning', 'matter',
		'life', 'palette', 'density', 'scale', 'geometry', 'light', 'entropy',
	];

	const result = {} as SchemaDistributions;

	for (const field of fields) {
		result[field] = {};
		for (const room of rooms) {
			const val = room.schema[field] as string;
			result[field][val] = (result[field][val] ?? 0) + 1;
		}
	}

	return result;
}
