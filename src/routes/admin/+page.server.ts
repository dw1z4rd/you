import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import { computeStats, fetchRoomsFromRegistry, type Stats } from '$lib/server/admin-stats';

export type { Stats };

export const load: PageServerLoad = async ({ fetch }) => {
	const host  = env.PARTYKIT_HOST ?? 'localhost:1999';
	const token = env.ADMIN_TOKEN   ?? '';
	const rooms = await fetchRoomsFromRegistry(fetch, host, token);
	return { stats: computeStats(rooms) };
};
