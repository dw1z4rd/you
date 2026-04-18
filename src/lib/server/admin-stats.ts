import type { RoomEntry } from '../../../party/registry';
import type { UniverseSchema } from '$lib/universe/types';

export interface Stats {
	totalRooms:    number;
	activeRooms:   number;
	activePlayers: number;
	rooms:         RoomEntry[];
	distributions: { [K in keyof UniverseSchema]: Record<string, number> };
}

const SCHEMA_FIELDS: (keyof UniverseSchema)[] = [
	'consciousness', 'identity', 'time', 'causality', 'meaning', 'matter',
	'life', 'palette', 'density', 'scale', 'geometry', 'light', 'entropy',
];

export function computeStats(rooms: RoomEntry[]): Stats {
	const distributions = {} as Stats['distributions'];
	for (const field of SCHEMA_FIELDS) {
		distributions[field] = {};
		for (const room of rooms) {
			const val = room.schema[field] as string;
			distributions[field][val] = (distributions[field][val] ?? 0) + 1;
		}
	}
	return {
		totalRooms:    rooms.length,
		activeRooms:   rooms.filter(r => r.playerCount > 0).length,
		activePlayers: rooms.reduce((sum, r) => sum + r.playerCount, 0),
		rooms:         rooms.sort((a, b) => b.lastActive - a.lastActive),
		distributions,
	};
}

export async function fetchRoomsFromRegistry(
	fetchFn: typeof fetch,
	host: string,
	token: string
): Promise<RoomEntry[]> {
	const protocol = host.startsWith('localhost') ? 'http' : 'https';
	try {
		const res = await fetchFn(`${protocol}://${host}/parties/registry/global`, {
			headers: { 'x-admin-token': token },
		});
		if (!res.ok) return [];
		const data = await res.json() as { rooms: Record<string, RoomEntry> };
		return Object.values(data.rooms ?? {});
	} catch {
		return [];
	}
}
